import helmet from '@fastify/helmet'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const securityPlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(helmet, {
        global: true,
        contentSecurityPolicy: false
    })
}

export default fp(securityPlugin, {
    name: 'security'
})
