import type { FastifyBaseLogger } from 'fastify';
import { LOG_EVENTS } from '../../lib/observability/log-events';
import type {
    DegradationItem,
    LiveAggregateQuery,
    LiveAggregateResponse,
    LiveCouponData,
    LiveProductItem,
    LiveRecommendationItem,
    LiveRoomData,
    SegmentResult,
} from './live.types';

/*
 * service 层是这个 demo 最核心的地方。
 *
 * 为什么聚合、降级、编排逻辑应该放在 service：
 * 1. 这些逻辑是业务行为，不是 HTTP 协议行为。
 * 2. service 更适合同时组织多个数据片段，再决定最终返回什么。
 * 3. 以后即使换成真实下游调用，这一层的职责也不会变。
 */

function createFailSet(query: LiveAggregateQuery): Set<string> {
    // 把逗号分隔的字符串转成 Set，后面判断某个片段是否需要失败会更高效也更直观。
    return new Set(
        (query.failSegments || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
    );
}

async function simulateSegment<T>(
    segment: string,
    failSet: Set<string>,
    producer: () => T,
    fallback: T,
): Promise<SegmentResult<T>> {
    // 这个函数是 demo 的关键：它模拟“单个片段成功”或“单个片段降级”的行为。
    // 真实项目里，这里通常会替换成调用下游 + fallback 的过程。
    if (failSet.has(segment)) {
        return {
            value: fallback,
            degraded: true,
            reason: `${segment} degraded to fallback`,
        };
    }

    return {
        value: producer(),
        degraded: false,
    };
}

function getLiveRoom(roomId: string): LiveRoomData {
    // 当前仓库为了聚焦框架学习，先用固定 mock 数据代替真实下游返回。
    return {
        roomId,
        title: '直播间演示数据',
        status: 'living',
        streamer: {
            id: 'anchor-1001',
            nickname: '演示主播',
        },
    };
}

export async function getLiveRoomAggregate(
    roomId: string,
    query: LiveAggregateQuery,
    logger?: FastifyBaseLogger,
): Promise<LiveAggregateResponse> {
    const failSet = createFailSet(query);

    // Promise.all 的意义是并发获取多个片段。
    // 对聚合接口来说，并发通常比串行更接近真实 BFF 的执行方式。
    const [room, productList, coupon, recommendation] = await Promise.all([
        simulateSegment<LiveRoomData>('room', failSet, () => getLiveRoom(roomId), {
            roomId,
            title: '直播间信息降级',
            status: 'unknown',
            streamer: null,
        }),
        simulateSegment(
            'productList',
            failSet,
            (): LiveProductItem[] => [
                { productId: 'sku-1001', name: '演示商品 A', price: 99 },
                { productId: 'sku-1002', name: '演示商品 B', price: 159 },
            ],
            [],
        ),
        simulateSegment<LiveCouponData>(
            'coupon',
            failSet,
            () => ({
                available: true,
                couponId: 'coupon-888',
                discountText: '满199减20',
            }),
            {
                available: false,
            },
        ),
        simulateSegment(
            'recommendation',
            failSet,
            (): LiveRecommendationItem[] => [
                { productId: 'sku-2001', name: '推荐商品 1' },
                { productId: 'sku-2002', name: '推荐商品 2' },
            ],
            [],
        ),
    ]);

    const degradationSources: Array<[string, { degraded: boolean; reason?: string }]> = [
        ['room', room],
        ['productList', productList],
        ['coupon', coupon],
        ['recommendation', recommendation],
    ];

    const degradation: DegradationItem[] = degradationSources
        .filter(([, result]) => result.degraded)
        .map(([segment, result]) => ({
            segment,
            strategy: 'fallback',
            reason: result.reason,
        }));

    if (degradation.length > 0) {
        logger?.warn(
            {
                event: LOG_EVENTS.LIVE_AGGREGATE_DEGRADED,
                roomId,
                degradedSegments: degradation.map((item) => item.segment),
                degradationCount: degradation.length,
                failSegments: query.failSegments || undefined,
            },
            'live aggregate degraded',
        );
    }

    // 最终响应既返回 data，也显式返回 degradation 信息。
    // 这样前端不仅知道“有没有拿到数据”，还知道“哪些片段其实是兜底值”。
    return {
        success: true,
        code: degradation.length > 0 ? 'PARTIAL_SUCCESS' : 'OK',
        message: degradation.length > 0 ? 'Some segments degraded' : 'ok',
        data: {
            room: room.value,
            productList: productList.value,
            coupon: coupon.value,
            recommendation: recommendation.value,
        },
        degradation: {
            degraded: degradation.length > 0,
            items: degradation,
        },
    };
}
