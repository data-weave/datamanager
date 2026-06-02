import { LiveReference } from '@data-weave/datamanager'
import { describe, expect, test } from '@jest/globals'
import { autorun } from 'mobx'
import { ObservableReference } from '../src/ObservableReference'

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

describe('ObservableReference update propagation', () => {
    test('autorun re-runs when source publishes a new value', () => {
        const ref = new TestRef<{ n: number }>('x')
        const reactive = ObservableReference(ref)
        const seen: ({ n: number } | undefined)[] = []
        const dispose = autorun(() => {
            seen.push(reactive.value)
        })
        ref.publish({ n: 1 })
        ref.publish({ n: 2 })
        dispose()
        expect(seen).toEqual([undefined, { n: 1 }, { n: 2 }])
    })

    test('the bridge is idempotent across multiple wraps of the same source', () => {
        const ref = new TestRef<number>('x')
        const a = ObservableReference(ref)
        const b = ObservableReference(ref)
        const seenA: (number | undefined)[] = []
        const seenB: (number | undefined)[] = []

        const disposeA = autorun(() => {
            seenA.push(a.value)
        })
        const disposeB = autorun(() => {
            seenB.push(b.value)
        })

        ref.publish(1)

        disposeA()
        disposeB()

        expect(seenA.at(-1)).toBe(1)
        expect(seenB.at(-1)).toBe(1)
    })
})
