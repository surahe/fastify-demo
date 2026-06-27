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

        if (Date.now() > entry.expiresAt) {
            this.store.delete(key)
            return undefined
        }

        return entry.value as T
    }

    set<T>(key: string, value: T, ttlMs = this.defaultTtlMs): void {
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
        return true
    }

    size(): number {
        return this.store.size
    }
}
