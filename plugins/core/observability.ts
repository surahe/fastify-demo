import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { LOG_EVENTS } from '../../lib/observability/log-events';

/*
 * observability 插件负责“请求可观测性”。
 *
 * 为什么要放在 hook 里统一做：
 * 1. access log 和 metrics 都是全站能力，不应该让每条路由自己手写。
 * 2. 采集点越统一，后面看的数据越可信，也更适合接日志平台与监控。
 * 3. 出现慢接口、错误率异常时，平台层日志比业务打印更容易做横向排查。
 */

const observabilityPlugin: FastifyPluginAsync = async (fastify) => {
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

        request.log.info(
            {
                event: LOG_EVENTS.HTTP_ACCESS,
                requestId: request.id,
                method: request.method,
                url: request.url,
                route,
                statusCode: reply.statusCode,
                durationMs: reply.elapsedTime,
            },
            'access log',
        );
    });
};

export default fp(observabilityPlugin, {
    name: 'observability',
});
