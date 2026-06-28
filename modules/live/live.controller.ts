import type { FastifyReply, FastifyRequest } from 'fastify';
import { getLiveRoomAggregate } from './live.service';
import type { LiveAggregateQuery, LiveRoomParams } from './live.types';

/*
 * controller 层负责“接 HTTP 请求，再把干净的参数交给 service”。
 *
 * 为什么 controller 要尽量薄：
 * 1. controller 的职责是协议适配，不是承载复杂业务。
 * 2. 如果把业务逻辑堆在这里，后面会很难测试、很难复用。
 * 3. service 才是更适合放聚合、降级、调用下游的地方。
 */

export async function getLiveRoomAggregateHandler(
    request: FastifyRequest<{ Params: LiveRoomParams; Querystring: LiveAggregateQuery }>,
    _reply: FastifyReply,
) {
    // controller 只做最轻的一层转发：从 request 里取参数，然后调用 service。
    return getLiveRoomAggregate(request.params.roomId, request.query);
}
