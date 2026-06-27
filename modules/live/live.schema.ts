import type { FastifySchema } from 'fastify'

const liveRoomParamsJsonSchema = {
    params: {
        type: 'object',
        required: ['roomId'],
        properties: {
            roomId: { type: 'string', minLength: 1 }
        }
    }
} as const

export const getLiveRoomAggregateRouteSchema: FastifySchema = {
    tags: ['live'],
    summary: 'Get live room aggregate data',
    ...liveRoomParamsJsonSchema,
    querystring: {
        type: 'object',
        properties: {
            failSegments: { type: 'string' }
        }
    },
    response: {
        200: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                code: { type: 'string' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    additionalProperties: true
                },
                degradation: {
                    type: 'object',
                    additionalProperties: true
                }
            },
            additionalProperties: true,
            required: ['success', 'code', 'message', 'data', 'degradation']
        }
    }
}
