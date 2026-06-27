import type { FastifyReply, FastifyRequest } from 'fastify'
import { getLiveRoomAggregate } from './live.service'
import type { LiveAggregateQuery, LiveRoomParams } from './live.types'

export async function getLiveRoomAggregateHandler(
    request: FastifyRequest<{ Params: LiveRoomParams; Querystring: LiveAggregateQuery }>,
    _reply: FastifyReply
) {
    return getLiveRoomAggregate(request.params.roomId, request.query)
}
