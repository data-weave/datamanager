import { LiveList } from '@data-weave/datamanager'
import { createAtom } from 'mobx'

export type ObservableList<T> = LiveList<T>

export const ObservableList = <T>(sourceList: LiveList<T>): LiveList<T> => {
    const atom = createAtom(
        'ObservableList',
        () => sourceList.resolve(),
        () => sourceList.unsubscribe()
    )

    return new Proxy(sourceList, {
        get(target, prop, receiver) {
            if (prop === 'values' || prop === 'resolved' || prop === 'hasError' || prop === 'error') {
                atom.reportObserved()
            }

            if (prop === 'onValuesChange') {
                atom.reportChanged()
            }

            return Reflect.get(target, prop, receiver)
        },
    })
}
