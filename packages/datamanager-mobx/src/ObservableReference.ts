import { LiveReference } from '@data-weave/datamanager'
import { createAtom } from 'mobx'

export const ObservableReference = <T>(sourceReference: LiveReference<T>): LiveReference<T> => {
    const atom = createAtom(
        'ObservableReference',
        () => sourceReference.resolve(),
        () => sourceReference.unsubscribe()
    )

    sourceReference.registerOnChangeListener(() => {
        atom.reportChanged()
    })

    return new Proxy(sourceReference, {
        get(target, prop, receiver) {
            if (prop === 'value' || prop === 'resolved' || prop === 'hasError' || prop === 'error') {
                atom.reportObserved()
            }

            return Reflect.get(target, prop, receiver)
        },
    })
}
