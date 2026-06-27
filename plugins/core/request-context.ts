import fastifyRequestContext from '@fastify/request-context'
import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'

interface MutableRequestContext {
    set(key: string, value: unknown): void
}

const requestContextPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(fastifyRequestContext as unknown as FastifyPluginAsync)

    fastify.addHook('onRequest', async (request: FastifyRequest) => {
        const requestContext = request.requestContext as unknown as MutableRequestContext

        requestContext.set('requestId', request.id)
        requestContext.set('method', request.method)
        requestContext.set('url', request.url)
        requestContext.set('host', request.host)

        if (request.headers.origin) {
            requestContext.set('origin', request.headers.origin)
        }
    })
}

export default fp(requestContextPlugin, {
    name: 'request-context'
})
