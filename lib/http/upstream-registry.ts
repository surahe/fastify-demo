import type { AppConfig } from '../../config'
import { HttpClient, type HttpClientSnapshot } from './http-client'

/*
 * UpstreamRegistry 的作用是统一管理“当前 BFF 能访问哪些后端服务”。
 *
 * 为什么不在业务里直接 new HttpClient：
 * 1. 下游服务地址、超时、重试等配置应该统一收口，而不是每个模块自己配一套。
 * 2. readiness 检查需要一个中心位置查看所有下游状态。
 * 3. 以后新增 service，只需要扩这里，不会让业务代码知道过多基础设施细节。
 */

export interface UpstreamReadinessReport {
    isReady: boolean
    configuredServices: string[]
    services: Record<string, HttpClientSnapshot>
}

export class UpstreamRegistry {
    private readonly clients = new Map<string, HttpClient>()

    constructor(config: AppConfig) {
        const commonOptions = config.upstreamDefaults

        // 只有配置了地址的下游服务才会被真正注册。
        // 这样做的好处是：本地开发可以只接一部分依赖，不需要所有服务都齐全。
        if (config.upstream.liveApiBaseUrl) {
            this.clients.set(
                'liveApi',
                new HttpClient({
                    name: 'liveApi',
                    baseUrl: config.upstream.liveApiBaseUrl,
                    ...commonOptions
                })
            )
        }

        if (config.upstream.tradeApiBaseUrl) {
            this.clients.set(
                'tradeApi',
                new HttpClient({
                    name: 'tradeApi',
                    baseUrl: config.upstream.tradeApiBaseUrl,
                    ...commonOptions
                })
            )
        }
    }

    has(name: string): boolean {
        return this.clients.has(name)
    }

    get(name: string): HttpClient {
        const client = this.clients.get(name)

        if (!client) {
            // 这里直接抛错，是为了尽快暴露“配置缺失”或“调用方写错服务名”的问题。
            throw new Error(`Upstream client "${name}" is not configured`)
        }

        return client
    }

    readiness(): UpstreamReadinessReport {
        // readiness 不要求下游一定“完全成功”，但至少要知道熔断器是否已经处于 open。
        // 如果某个关键依赖已经完全不可用，平台可以根据这里的结果把自己标成 degraded。
        const services = Object.fromEntries(
            Array.from(this.clients.entries()).map(([name, client]) => [name, client.snapshot()])
        )

        const isReady = Object.values(services).every((item) => item.circuitState !== 'open')

        return {
            isReady,
            configuredServices: Array.from(this.clients.keys()),
            services
        }
    }
}
