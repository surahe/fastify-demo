import { UpstreamBadResponseError, UpstreamTimeoutError, UpstreamUnavailableError } from '../../errors/app-error'

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

        for (let attempt = 0; attempt <= retries; attempt += 1) {
            try {
                this.guardCircuit()

                const controller = new AbortController()
                const timeout = setTimeout(() => controller.abort(), requestOptions.timeoutMs ?? this.options.timeoutMs)

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

                clearTimeout(timeout)

                if (!response.ok) {
                    const error = new UpstreamBadResponseError(this.options.name, {
                        status: response.status,
                        path
                    })

                    if (attempt < retries && response.status >= 500) {
                        await sleep(this.options.retryDelayMs)
                        continue
                    }

                    this.recordFailure()
                    return this.handleFailure(error, requestOptions)
                }

                const data = (await response.json()) as T
                this.recordSuccess()
                return data
            } catch (error) {
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

        if (this.failureCount >= this.options.circuitBreakerThreshold) {
            this.circuitState = 'open'
            this.openedAt = Date.now()
        }
    }

    private handleFailure<T>(error: Error, requestOptions: HttpRequestOptions): T {
        if (requestOptions.fallback) {
            return requestOptions.fallback<T>()
        }

        throw error
    }
}
