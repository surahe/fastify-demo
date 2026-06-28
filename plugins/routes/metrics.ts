import type { FastifyPluginAsync } from 'fastify'

/*
 * metrics 路由负责把当前进程内采集到的指标对外暴露出来。
 *
 * 为什么把它单独做成平台路由：
 * 1. 指标是全局能力，不属于某个业务模块。
 * 2. 监控系统或本地开发工具通常只关心一个固定入口。
 * 3. 未来如果换成 Prometheus / OTEL，这个位置也很容易替换。
 */

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
            // 这里返回的是“当前快照”，不是历史明细。
            // 对学习项目来说，快照足够展示采集思路，而且实现成本最低。
            const metrics = fastify.metricsStore.snapshot()

            return {
                metrics,
                alerting: {
                    // suggestedThresholds 不是硬规则，只是给后续接真实告警平台时一个起点参考。
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
