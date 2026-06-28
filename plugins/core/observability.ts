import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/*
 * observability 插件负责“请求可观测性”。
 *
 * 为什么要放在 hook 里统一做：
 * 1. 入口日志和出口日志是所有接口都需要的，不应该让每条路由手写。
 * 2. metrics 采集点越统一，后面看的数据越可信。
 * 3. 出现慢接口、错误率异常时，平台层日志比业务打印更容易做横向排查。
 */

const observabilityPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.addHook('onRequest', async (request) => {
        // onRequest 是请求进入系统的最早阶段之一，适合记录“收到请求”这一刻的信息。
        request.log.info(
            {
                requestId: request.id,
                method: request.method,
                url: request.url,
            },
            'request received',
        );
    });

    fastify.addHook('onResponse', async (request, reply) => {
        // routeOptions.url 比 request.url 更适合做指标聚合，
        // 因为它保留的是“路由模板”，不会把 roomId 这种动态值打散成很多条。
        const route = request.routeOptions.url || request.url;

        fastify.metricsStore.record({
            route,
            method: request.method,
            statusCode: reply.statusCode,
            durationMs: reply.elapsedTime,
        });

        // 出口日志和入口日志配合使用，可以快速看出一次请求的耗时和最终状态。
        request.log.info(
            {
                requestId: request.id,
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
                responseTime: reply.elapsedTime,
            },
            'request completed',
        );
    });
};

export default fp(observabilityPlugin, {
    name: 'observability',
});
