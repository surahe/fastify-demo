import type { FastifyPluginAsync } from 'fastify';

/*
 * 这个文件放的是“平台路由”，不是业务路由。
 *
 * 为什么 health / readiness 要单独放在这里：
 * 1. 它们服务于运维、监控、测试和部署流程，不属于某个具体业务模块。
 * 2. 这些接口应该长期稳定存在，和业务增删无关。
 * 3. 把平台接口单独归类后，业务目录可以更纯粹。
 */

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
                            uptime: { type: 'number' },
                        },
                        additionalProperties: true,
                        required: ['status', 'uptime'],
                    },
                },
            },
        },
        async () => {
            // /health 只回答“进程是否还活着”，所以逻辑尽量简单、尽量不依赖外部资源。
            return {
                status: 'ok',
                uptime: process.uptime(),
            };
        },
    );

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
                                additionalProperties: true,
                            },
                        },
                        additionalProperties: true,
                        required: ['status', 'checks'],
                    },
                    503: {
                        type: 'object',
                        properties: {
                            status: { type: 'string' },
                            checks: {
                                type: 'object',
                                additionalProperties: true,
                            },
                        },
                        additionalProperties: true,
                        required: ['status', 'checks'],
                    },
                },
            },
        },
        async (_request, reply) => {
            // /readiness 比 /health 更严格：它要回答“当前服务是否适合继续接流量”。
            const upstream = fastify.upstreamRegistry.readiness();
            const isReady = upstream.isReady && !fastify.isUnderPressure();

            // 503 的意义不是“进程挂了”，而是“服务当前不适合接入新的正式流量”。
            reply.code(isReady ? 200 : 503).send({
                status: isReady ? 'ready' : 'degraded',
                checks: {
                    upstream,
                    underPressure: fastify.isUnderPressure(),
                },
            });
        },
    );
};

export default healthRoutePlugin;
