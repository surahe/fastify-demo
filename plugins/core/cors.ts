import cors from '@fastify/cors';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import appConfig from '../../config';

/*
 * 这个插件负责跨域访问控制。
 *
 * 为什么 BFF 需要显式处理 CORS：
 * 1. H5 / Web 项目在浏览器里直接请求 BFF 时，浏览器会先检查跨域策略。
 * 2. 如果这里不统一处理，前端会出现“接口明明通了但浏览器拦掉”的问题。
 * 3. 允许哪些域访问，应该属于平台配置，而不是写死在业务路由里。
 */

const corsPlugin: FastifyPluginAsync = async (fastify) => {
    const allowedOrigins = new Set(appConfig.cors.allowedOrigins);

    await fastify.register(cors, {
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        // 这里只放白名单 header，目的是明确告诉浏览器哪些请求头可以被前端发送。
        allowedHeaders: ['content-type', 'authorization', appConfig.fastify.requestIdHeader],
        origin(origin, callback) {
            if (!origin) {
                // 没有 origin 的请求通常不是浏览器跨域场景，比如服务间调用或本地工具调用。
                callback(null, true);
                return;
            }

            // 只允许配置里声明过的来源访问，避免把接口无条件开放给任意网页。
            callback(null, allowedOrigins.has(origin));
        },
    });
};

export default fp(corsPlugin, {
    name: 'cors',
});
