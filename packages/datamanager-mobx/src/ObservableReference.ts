import { LiveReference } from '@data-weave/datamanager'
import { createAtom } from 'mobx'

export type ObservableReference<T> = LiveReference<T>

export const ObservableReference = <T>(sourceReference: LiveReference<T>): LiveReference<T> => {
    const atom = createAtom(
        'ObservableReference',
        () => sourceReference.resolve(),
        () => sourceReference.unSubscribe()
    )

    return new Proxy(sourceReference, {
        get(target, prop, receiver) {
            if (prop === 'value' || prop === 'resolved' || prop === 'hasError' || prop === 'error') {
                atom.reportObserved()
            }

            if (prop === 'onValueChange') {
                atom.reportChanged()
            }

            return Reflect.get(target, prop, receiver)
        },
    })
}
