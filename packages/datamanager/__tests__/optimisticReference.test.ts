import { describe, expect, test } from '@jest/globals'
import { LiveReference } from '../src/LiveReference'
import { OptimisticReference } from '../src/OptimisticReference'

class FakeSource<T extends object> extends LiveReference<T> {
    constructor() {
        super('fake', {})
    }

    set(v: T | undefined): void {
        this.onUpdate(v)
    }

    async resolve(): Promise<T | undefined> {
        return this.value
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
        expect(opt.value).toEqual({ state: 'pending', userId: null })
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
