import cors from '@fastify/cors'
import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import appConfig from '../../config'

const corsPlugin: FastifyPluginAsync = async (fastify) => {
    const allowedOrigins = new Set(appConfig.cors.allowedOrigins)

    await fastify.register(cors, {
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['content-type', 'authorization', appConfig.fastify.requestIdHeader],
        origin(origin, callback) {
            if (!origin) {
                callback(null, true)
                return
            }

            callback(null, allowedOrigins.has(origin))
        }
    })
}

export default fp(corsPlugin, {
    name: 'cors'
})
