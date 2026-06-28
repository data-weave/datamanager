import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { LiveList } from '../src/LiveList'

class TestList<T> extends LiveList<T> {
    constructor() {
        super({})
    }

    updateAt(index: number, value: T): void {
        this.onUpdateAtIndex(index, value)
    }

    addAt(index: number, value: T): void {
        this.onAddAtIndex(index, value)
    }

    removeAt(index: number): void {
        this.onRemoveAtIndex(index)
    }

    seed(values: T[]): void {
        this.onUpdateAll(values)
    }
}

describe('LiveList index-based mutations notify subscribers', () => {
    test('onUpdateAtIndex fires onValuesChange and the options callback', () => {
        let notifyChangeCalls = 0
        let lastOnUpdateValues: number[] | undefined
        const list = new TestList<number>()
        list.registerOnChangeListener(() => {
            notifyChangeCalls += 1
        })
        // @ts-expect-error - _options is protected and we need to access it for the test
        list._options.onUpdate = (vs: number[]) => {
            lastOnUpdateValues = [...vs]
        }
        list.seed([1, 2, 3])
        const baseline = notifyChangeCalls

        list.updateAt(1, 20)

        assert.deepEqual(list.values, [1, 20, 3])
        assert.equal(notifyChangeCalls, baseline + 1)
        assert.deepEqual(lastOnUpdateValues, [1, 20, 3])
    })

    test('onAddAtIndex fires callback and the options callback', () => {
        let notifyChangeCalls = 0
        let lastOnUpdateValues: number[] | undefined
        const list = new TestList<number>()
        list.registerOnChangeListener(() => {
            notifyChangeCalls += 1
        })
        // @ts-expect-error - _options is protected and we need to access it for the test
        list._options.onUpdate = (vs: number[]) => {
            lastOnUpdateValues = [...vs]
        }
        list.seed([1, 3])
        const baseline = notifyChangeCalls

        list.addAt(1, 2)

        assert.deepEqual(list.values, [1, 2, 3])
        assert.equal(notifyChangeCalls, baseline + 1)
        assert.deepEqual(lastOnUpdateValues, [1, 2, 3])
    })

    test('onRemoveAtIndex fires callback and the options callback', () => {
        let notifyChangeCalls = 0
        let lastOnUpdateValues: number[] | undefined
        const list = new TestList<number>()
        list.registerOnChangeListener(() => {
            notifyChangeCalls += 1
        })
        // @ts-expect-error - _options is protected and we need to access it for the test
        list._options.onUpdate = (vs: number[]) => {
            lastOnUpdateValues = [...vs]
        }
        list.seed([1, 2, 3])
        const baseline = notifyChangeCalls

        list.removeAt(1)

        assert.deepEqual(list.values, [1, 3])
        assert.equal(notifyChangeCalls, baseline + 1)
        assert.deepEqual(lastOnUpdateValues, [1, 3])
    })
})
