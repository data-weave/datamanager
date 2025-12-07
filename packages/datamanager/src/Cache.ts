// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface Cache<K = any, V = any> {
    get(key: K): V | undefined
    set(key: K, value: V): void
    has(key: K): boolean
}

export class MapCache<K, V> implements Cache<K, V> {
    private cache = new Map<K, V>()
    private maxSize?: number

    constructor(maxSize?: number) {
        this.maxSize = maxSize
    }

    get(key: K): V | undefined {
        return this.cache.get(key)
    }

    set(key: K, value: V): void {
        if (this.maxSize && this.cache.size >= this.maxSize && !this.cache.has(key)) {
            // Remove the first entry (oldest) when cache is full
            const firstKey = this.cache.keys().next().value
            if (firstKey) {
                this.cache.delete(firstKey)
            }
        }
        this.cache.set(key, value)
    }

    has(key: K): boolean {
        return this.cache.has(key)
    }

    delete(key: K): boolean {
        return this.cache.delete(key)
    }

    clear(): void {
        this.cache.clear()
    }
}
