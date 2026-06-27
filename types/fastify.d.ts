import 'fastify'
import type { TtlCache } from '../lib/cache/ttl-cache'
import type { UpstreamRegistry } from '../lib/http/upstream-registry'
import type { MetricsStore } from '../lib/observability/metrics-store'

declare module 'fastify' {
    interface FastifyInstance {
        appCache: TtlCache
        metricsStore: MetricsStore
        upstreamRegistry: UpstreamRegistry
    }
}
