/*
 * 这是一个最小的内存指标存储器。
 *
 * 为什么先做成内存版：
 * 1. 这个项目当前重点是理解“指标怎么采集和聚合”，不是接完整监控平台。
 * 2. 内存实现足够轻，方便本地开发和测试观察效果。
 * 3. 以后如果接 Prometheus / OpenTelemetry，可以把采集点保留，替换输出方式。
 */

export interface MetricsRecordInput {
    route: string
    method: string
    statusCode: number
    durationMs: number
}

interface RouteMetrics {
    count: number
    errors: number
    totalDurationMs: number
    maxDurationMs: number
    lastStatusCode: number
}

export interface MetricsSnapshot {
    totals: {
        requests: number
        errors: number
        avgDurationMs: number
        errorRate: number
    }
    routes: Record<string, RouteMetrics & { avgDurationMs: number; errorRate: number }>
}

export class MetricsStore {
    private totalRequests = 0
    private totalErrors = 0
    private totalDurationMs = 0
    private readonly routes = new Map<string, RouteMetrics>()

    record(input: MetricsRecordInput): void {
        // totals 代表全局指标，适合快速判断整个服务的整体健康状态。
        this.totalRequests += 1
        this.totalDurationMs += input.durationMs

        if (input.statusCode >= 500) {
            this.totalErrors += 1
        }

        // route 维度指标更适合定位“哪一条接口慢、哪一条接口错误率高”。
        const key = `${input.method} ${input.route}`
        const current = this.routes.get(key) ?? {
            count: 0,
            errors: 0,
            totalDurationMs: 0,
            maxDurationMs: 0,
            lastStatusCode: 0
        }

        current.count += 1
        current.totalDurationMs += input.durationMs
        current.maxDurationMs = Math.max(current.maxDurationMs, input.durationMs)
        current.lastStatusCode = input.statusCode

        if (input.statusCode >= 500) {
            current.errors += 1
        }

        this.routes.set(key, current)
    }

    snapshot(): MetricsSnapshot {
        // snapshot 的职责是把内部累加态转换成“适合接口返回”的统计视图。
        // 这里顺便算出平均耗时和错误率，调用方不需要再重复计算。
        const routes = Object.fromEntries(
            Array.from(this.routes.entries()).map(([key, value]) => [
                key,
                {
                    ...value,
                    avgDurationMs: value.count === 0 ? 0 : Number((value.totalDurationMs / value.count).toFixed(2)),
                    errorRate: value.count === 0 ? 0 : Number((value.errors / value.count).toFixed(4))
                }
            ])
        )

        return {
            totals: {
                requests: this.totalRequests,
                errors: this.totalErrors,
                avgDurationMs:
                    this.totalRequests === 0 ? 0 : Number((this.totalDurationMs / this.totalRequests).toFixed(2)),
                errorRate: this.totalRequests === 0 ? 0 : Number((this.totalErrors / this.totalRequests).toFixed(4))
            },
            routes
        }
    }
}
