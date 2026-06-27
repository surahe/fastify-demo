import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const observabilityPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.addHook('onRequest', async (request) => {
        request.log.info(
            {
                requestId: request.id,
                method: request.method,
                url: request.url
            },
            'request received'
        )
    })

    fastify.addHook('onResponse', async (request, reply) => {
        const route = request.routeOptions.url || request.url

        fastify.metricsStore.record({
            route,
            method: request.method,
            statusCode: reply.statusCode,
            durationMs: reply.elapsedTime
        })

        request.log.info(
            {
                requestId: request.id,
                method: request.method,
                url: request.url,
                statusCode: reply.statusCode,
                responseTime: reply.elapsedTime
            },
            'request completed'
        )
    })
}

export default fp(observabilityPlugin, {
    name: 'observability'
})
