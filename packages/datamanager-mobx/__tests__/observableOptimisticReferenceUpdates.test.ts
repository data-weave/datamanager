import { LiveReference } from '@data-weave/datamanager'
import { describe, expect, test } from '@jest/globals'
import { autorun } from 'mobx'
import { ObservableOptimisticReference } from '../src/ObservableOptimisticReference'

class TestRef<T> extends LiveReference<T> {
    constructor(id: string) {
        super(id, {})
    }

    async resolve(): Promise<T | undefined> {
        return this.value
    }

    publish(value: T): void {
        this.onUpdate(value)
    }
}

describe('ObservableOptimisticLiveReference update propagation', () => {
    test('autorun re-runs when the source publishes a new value', () => {
        const ref = new TestRef<{ n: number }>('x')
        const reactive = ObservableOptimisticReference(ref)
        const seen: ({ n: number } | undefined)[] = []

        const dispose = autorun(() => {
            seen.push(reactive.value)
        })

        ref.publish({ n: 1 })
        ref.publish({ n: 2 })
        dispose()

        expect(seen).toEqual([undefined, { n: 1 }, { n: 2 }])
    })

    test('applyOptimistic triggers a reaction and overlays the source value', () => {
        const ref = new TestRef<{ state: string; userId: string | null }>('x')
        const reactive = ObservableOptimisticReference(ref)
        const seen: ({ state: string; userId: string | null } | undefined)[] = []

        const dispose = autorun(() => {
            seen.push(reactive.value)
        })

        ref.publish({ state: 'pending', userId: null })
        reactive.applyOptimistic({ state: 'linked', userId: 'u1' })

        dispose()

        expect(seen.at(-1)).toEqual({ state: 'linked', userId: 'u1' })
    })

    test('clearOptimistic triggers a reaction and reveals the source value again', () => {
        const ref = new TestRef<{ state: string }>('x')
        const reactive = ObservableOptimisticReference(ref)
        const seen: ({ state: string } | undefined)[] = []

        ref.publish({ state: 'pending' })

        const dispose = autorun(() => {
            seen.push(reactive.value)
        })

        reactive.applyOptimistic({ state: 'linked' })
        expect(seen.at(-1)).toEqual({ state: 'linked' })

        reactive.clearOptimistic()
        dispose()

        expect(seen.at(-1)).toEqual({ state: 'pending' })
    })

    test('optimistic patch survives a stale source publish', () => {
        const ref = new TestRef<{ state: string }>('x')
        const reactive = ObservableOptimisticReference(ref)
        const seen: ({ state: string } | undefined)[] = []

        const dispose = autorun(() => {
            seen.push(reactive.value)
        })

        reactive.applyOptimistic({ state: 'linked' })
        ref.publish({ state: 'skipped' })

        dispose()

        expect(seen.at(-1)).toEqual({ state: 'linked' })
    })

    test('optimistic patch is removed once the source publishes new data', () => {
        const ref = new TestRef<{ state: string }>('x')
        const reactive = ObservableOptimisticReference(ref, { clearOptimisticOnSourceUpdate: true })
        const seen: ({ state: string } | undefined)[] = []

        const dispose = autorun(() => {
            seen.push(reactive.value)
        })

        reactive.applyOptimistic({ state: 'linked' })
        ref.publish({ state: 'linked' })

        dispose()

        expect(reactive.hasPendingOptimistic).toBe(false)
        expect(reactive.value).toEqual({ state: 'linked' })
        expect(seen.at(-1)).toEqual({ state: 'linked' })
    })
})
