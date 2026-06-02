import { LiveList } from '@data-weave/datamanager'
import { createAtom } from 'mobx'

export const ObservableList = <T>(sourceList: LiveList<T>): LiveList<T> => {
    const atom = createAtom(
        'ObservableList',
        () => sourceList.resolve(),
        () => sourceList.unsubscribe()
    )

    sourceList.registerOnChangeListener(() => {
        atom.reportChanged()
    })

    return new Proxy(sourceList, {
        get(target, prop, receiver) {
            if (prop === 'values' || prop === 'resolved' || prop === 'hasError' || prop === 'error') {
                atom.reportObserved()
            }

            return Reflect.get(target, prop, receiver)
        },
    })
}
