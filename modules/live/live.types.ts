export interface LiveAggregateQuery {
    failSegments?: string
}

export interface LiveRoomParams {
    roomId: string
}

export interface LiveRoomData {
    roomId: string
    title: string
    status: string
    streamer: {
        id: string
        nickname: string
    } | null
}

export interface LiveProductItem {
    productId: string
    name: string
    price: number
}

export interface LiveRecommendationItem {
    productId: string
    name: string
}

export interface LiveCouponData {
    available: boolean
    couponId?: string
    discountText?: string
}

export interface DegradationItem {
    segment: string
    strategy: 'fallback'
    reason?: string
}

export interface SegmentResult<T> {
    value: T
    degraded: boolean
    reason?: string
}

export interface LiveAggregateResponse {
    success: boolean
    code: 'OK' | 'PARTIAL_SUCCESS'
    message: string
    data: {
        room: LiveRoomData
        productList: LiveProductItem[]
        coupon: LiveCouponData
        recommendation: LiveRecommendationItem[]
    }
    degradation: {
        degraded: boolean
        items: DegradationItem[]
    }
}
