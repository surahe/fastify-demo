import type { FastifyInstance } from 'fastify'
import { getLiveRoomAggregateHandler } from './live.controller'
import { getLiveRoomAggregateRouteSchema } from './live.schema'

async function liveRoutes(fastify: FastifyInstance): Promise<void> {
    fastify.get('/rooms/:roomId/aggregate', { schema: getLiveRoomAggregateRouteSchema }, getLiveRoomAggregateHandler)
}

export default liveRoutes
