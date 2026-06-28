/*
 * 这里定义 request context 里允许存放哪些字段。
 *
 * 为什么要单独声明：
 * 1. request context 本质上像一份“请求级共享字典”，但如果没有类型约束就很容易乱。
 * 2. 先把常用字段声明出来，后续读取时会有更好的提示和约束。
 * 3. tenantId、userId、liveId 这些字段虽然当前还没真正接入，但先留好类型扩展位。
 */

declare namespace fastifyRequestContext {
    interface RequestContextData {
        requestId: string;
        method: string;
        url: string;
        host?: string;
        origin?: string;
        tenantId?: string;
        userId?: string;
        liveId?: string;
    }
}
