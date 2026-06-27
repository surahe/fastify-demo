import type { FastifyPluginAsync } from 'fastify'

const metricsPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.get(
        '/metrics',
        {
            schema: {
                tags: ['platform'],
                summary: 'Metrics snapshot',
                response: {
                    200: {
                        type: 'object',
                        properties: {
                            metrics: {
                                type: 'object',
                                additionalProperties: true
                            },
                            alerting: {
                                type: 'object',
                                additionalProperties: true
                            }
                        },
                        additionalProperties: true,
                        required: ['metrics', 'alerting']
                    }
                }
            }
        },
        async () => {
            const metrics = fastify.metricsStore.snapshot()

            return {
                metrics,
                alerting: {
                    suggestedThresholds: {
                        errorRateWarn: 0.03,
                        errorRateCritical: 0.1,
                        avgDurationWarnMs: 300,
                        avgDurationCriticalMs: 800
                    }
                }
            }
        }
    )
}

export default metricsPlugin
