/*
 * types 层用来收口当前模块自己的类型定义。
 *
 * 为什么要单独放一个 types 文件：
 * 1. schema、controller、service 之间会共享一批类型，集中维护更清晰。
 * 2. 避免把类型定义散落到每个文件里，后面改字段时更容易漏改。
 * 3. 业务模块的边界会更清楚：这个模块到底操作哪些数据，一眼就能看出来。
 */

export interface LiveAggregateQuery {
    failSegments?: string;
}

export interface LiveRoomParams {
    roomId: string;
}

export interface LiveRoomData {
    roomId: string;
    title: string;
    status: string;
    streamer: {
        id: string;
        nickname: string;
    } | null;
}

export interface LiveProductItem {
    productId: string;
    name: string;
    price: number;
}

export interface LiveRecommendationItem {
    productId: string;
    name: string;
}

export interface LiveCouponData {
    available: boolean;
    couponId?: string;
    discountText?: string;
}

export interface DegradationItem {
    segment: string;
    strategy: 'fallback';
    reason?: string;
}

export interface SegmentResult<T> {
    // 这里把“值”和“是否降级”一起返回，是为了让聚合层能统一处理不同片段的结果。
    value: T;
    degraded: boolean;
    reason?: string;
}

export interface LiveAggregateResponse {
    success: boolean;
    code: 'OK' | 'PARTIAL_SUCCESS';
    message: string;
    data: {
        room: LiveRoomData;
        productList: LiveProductItem[];
        coupon: LiveCouponData;
        recommendation: LiveRecommendationItem[];
    };
    degradation: {
        degraded: boolean;
        items: DegradationItem[];
    };
}
