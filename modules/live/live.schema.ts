import type { FastifySchema } from 'fastify';

/*
 * schema 层负责定义“这条接口允许什么输入、承诺什么输出”。
 *
 * 为什么 Fastify 项目里 schema 很重要：
 * 1. 它会在请求真正进入业务逻辑前先做参数校验。
 * 2. 它也是 Swagger / OpenAPI 文档的重要来源。
 * 3. 它把接口契约显式写出来，前后端联调会更稳定。
 */

const liveRoomParamsJsonSchema = {
    params: {
        type: 'object',
        required: ['roomId'],
        properties: {
            roomId: { type: 'string', minLength: 1 },
        },
    },
} as const;

export const getLiveRoomAggregateRouteSchema: FastifySchema = {
    tags: ['live'],
    summary: 'Get live room aggregate data',
    // params、querystring、response 分开写，是为了清楚表达“路径参数 / 查询参数 / 响应结构”各自的边界。
    ...liveRoomParamsJsonSchema,
    querystring: {
        type: 'object',
        properties: {
            // failSegments 是当前 demo 专用参数，用来模拟某些片段失败后的降级效果。
            failSegments: { type: 'string' },
        },
    },
    response: {
        200: {
            // 这里没有把 data 内部每个字段都完全展开，是为了保持 demo 结构足够轻。
            // 真实业务里通常会把响应结构写得更细。
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                code: { type: 'string' },
                message: { type: 'string' },
                data: {
                    type: 'object',
                    additionalProperties: true,
                },
                degradation: {
                    type: 'object',
                    additionalProperties: true,
                },
            },
            additionalProperties: true,
            required: ['success', 'code', 'message', 'data', 'degradation'],
        },
    },
};
