declare namespace fastifyRequestContext {
    interface RequestContextData {
        requestId: string
        method: string
        url: string
        host?: string
        origin?: string
        tenantId?: string
        userId?: string
        liveId?: string
    }
}
