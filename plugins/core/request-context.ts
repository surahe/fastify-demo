import fastifyRequestContext from '@fastify/request-context';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

/*
 * 这个插件用来给“单次请求”挂一个上下文对象。
 *
 * 为什么 BFF 里需要 request context：
 * 1. 请求经过多层代码时，requestId、origin、tenantId 这类信息不适合层层手动传参。
 * 2. 把这些信息放到 request context 里，业务和日志都能在任意位置读取。
 * 3. 对接下游、打日志、排查问题时，统一上下文会非常方便。
 */

interface MutableRequestContext {
    set(key: string, value: unknown): void;
}

const requestContextPlugin: FastifyPluginAsync = async (fastify) => {
    // 先注册官方插件，让 Fastify 为每个请求都准备一份隔离的 context。
    await fastify.register(fastifyRequestContext as unknown as FastifyPluginAsync);

    fastify.addHook('onRequest', async (request: FastifyRequest) => {
        const requestContext = request.requestContext as unknown as MutableRequestContext;

        // onRequest 很早就执行，适合把基础上下文字段尽早写进去。
        requestContext.set('requestId', request.id);
        requestContext.set('method', request.method);
        requestContext.set('url', request.url);
        requestContext.set('host', request.host);

        if (request.headers.origin) {
            // origin 对 BFF 很有价值，因为很多跨端问题、CORS 问题都要靠它排查。
            requestContext.set('origin', request.headers.origin);
        }
    });
};

export default fp(requestContextPlugin, {
    name: 'request-context',
});
