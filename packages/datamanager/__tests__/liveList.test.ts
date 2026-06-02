import { describe, expect, test } from '@jest/globals'
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

        expect(list.values).toEqual([1, 20, 3])
        expect(notifyChangeCalls).toBe(baseline + 1)
        expect(lastOnUpdateValues).toEqual([1, 20, 3])
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

        expect(list.values).toEqual([1, 2, 3])
        expect(notifyChangeCalls).toBe(baseline + 1)
        expect(lastOnUpdateValues).toEqual([1, 2, 3])
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

        expect(list.values).toEqual([1, 3])
        expect(notifyChangeCalls).toBe(baseline + 1)
        expect(lastOnUpdateValues).toEqual([1, 3])
    })
})
