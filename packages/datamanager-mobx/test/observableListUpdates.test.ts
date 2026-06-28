import { LiveList } from '@data-weave/datamanager'
import { autorun } from 'mobx'
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { ObservableList } from '../src/ObservableList'

class TestList<T> extends LiveList<T> {
    constructor() {
        super({})
    }

    async resolve(): Promise<readonly T[]> {
        return this.values
    }

    publishAll(values: T[]): void {
        this.onUpdateAll(values)
    }

    publishError(error: unknown): void {
        this.onError(error)
    }
}

describe('ObservableList update propagation', () => {
    test('autorun re-runs when source publishes a new values array', () => {
        const list = new TestList<{ n: number }>()
        const reactive = ObservableList(list)
        const seen: { n: number }[][] = []

        const dispose = autorun(() => {
            seen.push([...reactive.values])
        })

        list.publishAll([{ n: 1 }])
        list.publishAll([{ n: 1 }, { n: 2 }])

        dispose()

        assert.deepEqual(seen, [[], [{ n: 1 }], [{ n: 1 }, { n: 2 }]])
    })

    test('autorun re-runs when `resolved` flips to true after first snapshot', () => {
        const list = new TestList<number>()
        const reactive = ObservableList(list)
        const resolvedSeen: boolean[] = []

        const dispose = autorun(() => {
            resolvedSeen.push(reactive.resolved)
        })
        list.publishAll([1, 2, 3])
        dispose()

        assert.deepEqual(resolvedSeen, [false, true])
    })

    test('autorun re-runs when source publishes an error', () => {
        const list = new TestList<number>()
        const reactive = ObservableList(list)
        const errorSeen: unknown[] = []

        const dispose = autorun(() => {
            errorSeen.push(reactive.error)
        })
        list.publishError(new Error('boom'))
        dispose()

        assert.deepEqual(errorSeen, [undefined, new Error('boom')])
    })

    test('the bridge is idempotent across multiple wraps of the same source', () => {
        const list = new TestList<number>()

        const a = ObservableList(list)
        const b = ObservableList(list)
        const seenA: number[][] = []
        const seenB: number[][] = []

        const disposeA = autorun(() => {
            seenA.push([...a.values])
        })
        const disposeB = autorun(() => {
            seenB.push([...b.values])
        })

        list.publishAll([1])

        disposeA()
        disposeB()

        assert.deepEqual(seenA.at(-1), [1])
        assert.deepEqual(seenB.at(-1), [1])
    })

    test('subscribe/unsubscribe lifecycle is driven by the atom', () => {
        let resolveCalls = 0
        let unsubscribeCalls = 0

        class LifecycleList extends LiveList<number> {
            constructor() {
                super({})
            }

            async resolve(): Promise<readonly number[]> {
                resolveCalls += 1
                return this.values
            }

            unsubscribe(): void {
                unsubscribeCalls += 1
            }
        }

        const list = new LifecycleList()
        const reactive = ObservableList(list)

        const dispose = autorun(() => {
            void reactive.values
        })
        assert.equal(resolveCalls, 1)
        assert.equal(unsubscribeCalls, 0)

        dispose()
        assert.equal(unsubscribeCalls, 1)
    })
})
