import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import appConfig from '../../config'
import { TtlCache } from '../../lib/cache/ttl-cache'
import { UpstreamRegistry } from '../../lib/http/upstream-registry'
import { MetricsStore } from '../../lib/observability/metrics-store'

const platformPlugin: FastifyPluginAsync = async (fastify) => {
    // 把缓存、监控和下游客户端统一挂到 Fastify 实例上，业务层按需使用。
    fastify.decorate('appCache', new TtlCache({ defaultTtlMs: appConfig.cache.ttlMs }))
    fastify.decorate('metricsStore', new MetricsStore())
    fastify.decorate('upstreamRegistry', new UpstreamRegistry(appConfig))
}

export default fp(platformPlugin, {
    name: 'platform'
})
