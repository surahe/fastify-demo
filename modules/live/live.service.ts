import type {
    DegradationItem,
    LiveAggregateQuery,
    LiveAggregateResponse,
    LiveCouponData,
    LiveProductItem,
    LiveRecommendationItem,
    LiveRoomData,
    SegmentResult
} from './live.types'

function createFailSet(query: LiveAggregateQuery): Set<string> {
    return new Set(
        (query.failSegments || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
    )
}

async function simulateSegment<T>(
    segment: string,
    failSet: Set<string>,
    producer: () => T,
    fallback: T
): Promise<SegmentResult<T>> {
    if (failSet.has(segment)) {
        return {
            value: fallback,
            degraded: true,
            reason: `${segment} degraded to fallback`
        }
    }

    return {
        value: producer(),
        degraded: false
    }
}

function getLiveRoom(roomId: string): LiveRoomData {
    return {
        roomId,
        title: '直播间演示数据',
        status: 'living',
        streamer: {
            id: 'anchor-1001',
            nickname: '演示主播'
        }
    }
}

export async function getLiveRoomAggregate(
    roomId: string,
    query: LiveAggregateQuery
): Promise<LiveAggregateResponse> {
    const failSet = createFailSet(query)

    const [room, productList, coupon, recommendation] = await Promise.all([
        simulateSegment<LiveRoomData>('room', failSet, () => getLiveRoom(roomId), {
            roomId,
            title: '直播间信息降级',
            status: 'unknown',
            streamer: null
        }),
        simulateSegment(
            'productList',
            failSet,
            (): LiveProductItem[] => [
                { productId: 'sku-1001', name: '演示商品 A', price: 99 },
                { productId: 'sku-1002', name: '演示商品 B', price: 159 }
            ],
            []
        ),
        simulateSegment<LiveCouponData>(
            'coupon',
            failSet,
            () => ({
                available: true,
                couponId: 'coupon-888',
                discountText: '满199减20'
            }),
            {
                available: false
            }
        ),
        simulateSegment(
            'recommendation',
            failSet,
            (): LiveRecommendationItem[] => [
                { productId: 'sku-2001', name: '推荐商品 1' },
                { productId: 'sku-2002', name: '推荐商品 2' }
            ],
            []
        )
    ])

    const degradationSources: Array<[string, { degraded: boolean; reason?: string }]> = [
        ['room', room],
        ['productList', productList],
        ['coupon', coupon],
        ['recommendation', recommendation]
    ]

    const degradation: DegradationItem[] = degradationSources
        .filter(([, result]) => result.degraded)
        .map(([segment, result]) => ({
            segment,
            strategy: 'fallback',
            reason: result.reason
        }))

    return {
        success: true,
        code: degradation.length > 0 ? 'PARTIAL_SUCCESS' : 'OK',
        message: degradation.length > 0 ? 'Some segments degraded' : 'ok',
        data: {
            room: room.value,
            productList: productList.value,
            coupon: coupon.value,
            recommendation: recommendation.value
        },
        degradation: {
            degraded: degradation.length > 0,
            items: degradation
        }
    }
}
