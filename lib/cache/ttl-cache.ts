/*
 * 这是一个最小可用的内存 TTL 缓存。
 *
 * 为什么项目里先保留这样一个简单版本：
 * 1. 这个仓库当前是学习型 BFF，不接 Redis，先有一个本地缓存骨架更容易理解。
 * 2. 很多接口的缓存核心思想并不复杂，先学会 TTL 和过期清理，再考虑分布式方案。
 * 3. 把缓存能力收口成类，未来如果换成 Redis，调用方的使用方式更容易保持稳定。
 */

interface CacheEntry<T> {
    value: T
    expiresAt: number
}

export interface TtlCacheOptions {
    defaultTtlMs: number
}

export class TtlCache {
    private readonly store = new Map<string, CacheEntry<unknown>>()
    private readonly defaultTtlMs: number

    constructor(options: TtlCacheOptions) {
        this.defaultTtlMs = options.defaultTtlMs
    }

    get<T>(key: string): T | undefined {
        const entry = this.store.get(key)

        if (!entry) {
            return undefined
        }

        // 这里采用“读取时顺便检查过期”的懒删除策略。
        // 好处是实现简单，不需要额外定时任务去扫描所有 key。
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key)
            return undefined
        }

        return entry.value as T
    }

    set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): void {
        // 写入时就把过期时间算好，后续读取只需要比较时间戳即可。
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
        })
    }

    delete(key: string): void {
        this.store.delete(key)
    }

    clear(): void {
        this.store.clear()
    }

    isReady(): boolean {
        // 这个缓存是纯内存实现，没有外部依赖，所以只要进程活着就认为它是 ready 的。
        return true
    }

    size(): number {
        return this.store.size
    }
}
