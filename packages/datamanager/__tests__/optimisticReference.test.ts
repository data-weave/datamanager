import { describe, expect, test } from '@jest/globals'
import { OptimisticReference } from '../src/OptimisticReference'
import type { Reference } from '../src/Reference'

class FakeSource<T extends object> implements Reference<T> {
    resolved = false
    hasError = false
    error: unknown
    private _value: T | undefined

    get value(): T | undefined {
        return this._value
    }

    set(v: T | undefined): void {
        this._value = v
    }

    async resolve(): Promise<T | undefined> {
        return this._value
    }
}

describe('OptimisticReference', () => {
    test('patch survives a non-matching source publish', () => {
        const src = new FakeSource<{ state: string }>()
        const opt = new OptimisticReference(src)
        opt.applyOptimistic({ state: 'linked' })
        src.set({ state: 'skipped' }) // stale snapshot from server
        expect(opt.value).toEqual({ state: 'linked' })
    })

    test('patch overlays partial fields onto base', () => {
        const src = new FakeSource<{ state: string; userId: string | null }>()
        src.set({ state: 'pending', userId: null })
        const opt = new OptimisticReference(src)
        opt.applyOptimistic({ state: 'linked', userId: 'u1' })
        expect(opt.value).toEqual({ state: 'linked', userId: 'u1' })
    })

    test('clearOptimistic removes the patch', () => {
        const src = new FakeSource<{ state: string }>()
        const opt = new OptimisticReference(src)
        opt.applyOptimistic({ state: 'linked' })
        opt.clearOptimistic()
        expect(opt.hasPendingOptimistic).toBe(false)
        expect(opt.value).toBeUndefined()
    })
})
