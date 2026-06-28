import type { FastifyInstance } from 'fastify';
import { getLiveRoomAggregateHandler } from './live.controller';
import { getLiveRoomAggregateRouteSchema } from './live.schema';

/*
 * routes 层只负责“把 URL、schema 和 handler 绑在一起”。
 *
 * 为什么要单独有这一层：
 * 1. 路由定义属于 HTTP 协议层，不应该和业务实现混在 service 里。
 * 2. 后续一个模块里接口多了以后，这一层会成为最清晰的接口目录。
 * 3. 读这个文件时，你应该先看到“模块暴露了哪些接口”，而不是先陷入业务细节。
 */

async function liveRoutes(fastify: FastifyInstance): Promise<void> {
    // 这里定义的是相对路径，真正对外的完整路径还会叠加 plugins/routes/live.ts 里的模块前缀。
    fastify.get('/rooms/:roomId/aggregate', { schema: getLiveRoomAggregateRouteSchema }, getLiveRoomAggregateHandler);
}

export default liveRoutes;
