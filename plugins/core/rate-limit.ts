import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import appConfig from '../../config';

/*
 * 限流插件的作用是保护 BFF 不被短时间的大量请求打垮。
 *
 * 为什么纯 BFF 也需要限流：
 * 1. BFF 本身虽然不落库，但它后面连着很多后端服务，放任突发流量会把下游一起压垮。
 * 2. 限流属于全站规则，放在平台层比散落到业务里更合理。
 * 3. 先把过高频率请求挡在入口，比等后端超时后再报错更省资源。
 */

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(rateLimit, {
        global: true,
        max: appConfig.rateLimit.globalMax,
        timeWindow: appConfig.rateLimit.timeWindow,
        // 把限流信息放到响应头里，方便前端或调用方知道当前额度情况。
        addHeadersOnExceeding: {
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true,
        },
        // 即使限流插件内部偶发出错，也尽量不要把整个请求链路一起拖挂。
        skipOnError: true,
    });
};

export default fp(rateLimitPlugin, {
    name: 'rate-limit',
});
