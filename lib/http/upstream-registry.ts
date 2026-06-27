import type { AppConfig } from '../../config'
import { HttpClient, type HttpClientSnapshot } from './http-client'

export interface UpstreamReadinessReport {
    isReady: boolean
    configuredServices: string[]
    services: Record<string, HttpClientSnapshot>
}

export class UpstreamRegistry {
    private readonly clients = new Map<string, HttpClient>()

    constructor(config: AppConfig) {
        const commonOptions = config.upstreamDefaults

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
            throw new Error(`Upstream client "${name}" is not configured`)
        }

        return client
    }

    readiness(): UpstreamReadinessReport {
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
