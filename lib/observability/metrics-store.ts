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
        this.totalRequests += 1
        this.totalDurationMs += input.durationMs

        if (input.statusCode >= 500) {
            this.totalErrors += 1
        }

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
