import type { FastifyPluginAsync } from 'fastify'
import liveRoutes from '../../modules/live/live.routes'

const livePlugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(liveRoutes, { prefix: '/api/live' })
}

export default livePlugin
