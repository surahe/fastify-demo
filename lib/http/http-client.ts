import { UpstreamBadResponseError, UpstreamTimeoutError, UpstreamUnavailableError } from '../../errors/app-error'

/*
 * 这是项目里的下游 HTTP 调用骨架。
 *
 * 为什么 BFF 不直接在 service 里裸写 fetch：
 * 1. 超时、重试、熔断、fallback 这些逻辑每个接口都会遇到，分散写会非常乱。
 * 2. 把“访问下游”的通用风险集中到这里，service 就能更专注于业务编排。
 * 3. 未来如果要统一加 header 透传、日志、trace，也只需要改这一层。
 */

type CircuitState = 'closed' | 'open' | 'half-open'

export interface HttpClientOptions {
    name: string
    baseUrl: string
    timeoutMs: number
    retries: number
    retryDelayMs: number
    circuitBreakerThreshold: number
    circuitBreakerResetMs: number
    defaultHeaders?: Record<string, string>
}

export interface HttpRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    headers?: Record<string, string>
    body?: unknown
    timeoutMs?: number
    retries?: number
    fallback?: <T>() => T
}

export interface HttpClientSnapshot {
    name: string
    baseUrl: string
    circuitState: CircuitState
    failureCount: number
    openedAt: number | null
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    })
}

export class HttpClient {
    private circuitState: CircuitState = 'closed'
    private failureCount = 0
    private openedAt: number | null = null
    private readonly options: HttpClientOptions

    constructor(options: HttpClientOptions) {
        this.options = options
    }

    async request<T>(path: string, requestOptions: HttpRequestOptions = {}): Promise<T> {
        const retries = requestOptions.retries ?? this.options.retries

        // 这里用 for 循环手动控制重试，而不是递归，
        // 原因是流程更直观，也更方便把每一次 attempt 的逻辑放在一起看。
        for (let attempt = 0; attempt <= retries; attempt += 1) {
            try {
                // 请求发出前先检查熔断器状态。
                // 如果当前依赖已经连续失败到达阈值，就不要继续给下游增加压力了。
                this.guardCircuit()

                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), requestOptions.timeoutMs ?? this.options.timeoutMs)

                // fetch 只做最基础的网络请求；真正的“平台语义”由这个类来补齐。
                const response = await fetch(new URL(path, this.options.baseUrl), {
                    method: requestOptions.method ?? 'GET',
                    headers: {
                        'content-type': 'application/json',
                        ...this.options.defaultHeaders,
                        ...requestOptions.headers
                    },
                    body: requestOptions.body ? JSON.stringify(requestOptions.body) : undefined,
                    signal: controller.signal
                })

                // 一旦请求结束，无论成功失败，都应该清掉 timeout，避免定时器泄漏。
                clearTimeout(timeout)

                if (!response.ok) {
                    // 非 2xx 响应说明下游“有响应但不符合预期”，所以映射成 BadResponse。
                    const error = new UpstreamBadResponseError(this.options.name, {
                        status: response.status,
                        path
                    })

                    // 这里只对 5xx 做自动重试，因为 4xx 往往是参数或权限问题，重试没有意义。
                    if (attempt < retries && response.status >= 500) {
                        await sleep(this.options.retryDelayMs)
                        continue
                    }

                    this.recordFailure()
                    return this.handleFailure(error, requestOptions)
                }

                const data = (await response.json()) as T
                // 请求成功后，及时把熔断器恢复成 closed，表示依赖已经重新健康。
                this.recordSuccess()
                return data
            } catch (error) {
                // AbortError 代表超时；其他错误通常是网络异常、DNS、连接失败等问题。
                const mappedError =
                    error instanceof Error && error.name === 'AbortError'
                        ? new UpstreamTimeoutError(this.options.name, { path })
                        : new UpstreamUnavailableError(this.options.name, { path, cause: error })

                if (attempt < retries) {
                    await sleep(this.options.retryDelayMs)
                    continue
                }

                this.recordFailure()
                return this.handleFailure(mappedError, requestOptions)
            }
        }

        // 理论上正常流程不会走到这里，这里只是给类型系统和极端兜底场景留一个保险出口。
        throw new UpstreamUnavailableError(this.options.name)
    }

    snapshot(): HttpClientSnapshot {
        return {
            name: this.options.name,
            baseUrl: this.options.baseUrl,
            circuitState: this.circuitState,
            failureCount: this.failureCount,
            openedAt: this.openedAt
        }
    }

    private guardCircuit(): void {
        if (this.circuitState !== 'open') {
            return
        }

        const isCooldownOver =
            this.openedAt !== null && Date.now() - this.openedAt >= this.options.circuitBreakerResetMs

        if (isCooldownOver) {
            // half-open 表示“允许试探性地再放一个请求过去”，
            // 看下游是否已经恢复，而不是无限期阻断。
            this.circuitState = 'half-open'
            return
        }

        throw new UpstreamUnavailableError(this.options.name, {
            reason: 'Circuit breaker is open'
        })
    }

    private recordSuccess(): void {
        this.failureCount = 0
        this.openedAt = null
        this.circuitState = 'closed'
    }

    private recordFailure(): void {
        this.failureCount += 1

        // 连续失败达到阈值后打开熔断，目的是快速失败，保护自己和下游。
        if (this.failureCount >= this.options.circuitBreakerThreshold) {
            this.circuitState = 'open'
            this.openedAt = Date.now()
        }
    }

    private handleFailure<T>(error: Error, requestOptions: HttpRequestOptions): T {
        if (requestOptions.fallback) {
            // fallback 的价值不是“把错误隐藏掉”，而是让非核心片段有机会用降级数据继续返回。
            return requestOptions.fallback<T>()
        }

        throw error
    }
}
