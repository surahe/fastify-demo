import type { FastifyPluginAsync } from 'fastify'

// 独立健康检查插件，给监控或测试快速确认服务是否存活。
const healthRoutePlugin: FastifyPluginAsync = async (fastify) => {
    fastify.get(
        '/health',
        {
            schema: {
                tags: ['platform'],
                summary: 'Health check',
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            uptime: { type: 'number' }
                        },
                        additionalProperties: true,
                        required: ['status', 'uptime']
                    }
                }
            }
        },
        async () => {
            return {
                status: 'ok',
                uptime: process.uptime()
            }
        }
    )

    fastify.get(
        '/readiness',
        {
            schema: {
                tags: ['platform'],
                summary: 'Readiness check',
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            checks: {
                                type: 'object',
                                additionalProperties: true
                            }
                        },
                        additionalProperties: true,
                        required: ['status', 'checks']
                    },
                    503: {
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            checks: {
                                type: 'object',
                                additionalProperties: true
                            }
                        },
                        additionalProperties: true,
                        required: ['status', 'checks']
                    }
                }
            }
        },
        async (_request, reply) => {
            const upstream = fastify.upstreamRegistry.readiness()
            const cacheReady = fastify.appCache.isReady()
            const isReady = cacheReady && upstream.isReady && !fastify.isUnderPressure()

            reply.code(isReady ? 200 : 503).send({
                status: isReady ? 'ready' : 'degraded',
                checks: {
                    cache: cacheReady,
                    upstream,
                    underPressure: fastify.isUnderPressure()
                }
            })
        }
    )
}

export default healthRoutePlugin
