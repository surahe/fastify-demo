import rateLimit from '@fastify/rate-limit'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import appConfig from '../../config'

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(rateLimit, {
        global: true,
        max: appConfig.rateLimit.globalMax,
        timeWindow: appConfig.rateLimit.timeWindow,
        addHeadersOnExceeding: {
            'x-ratelimit-limit': true,
            'x-ratelimit-remaining': true,
            'x-ratelimit-reset': true
        },
        skipOnError: true
    })
}

export default fp(rateLimitPlugin, {
    name: 'rate-limit'
})
