import { LiveReference, OptimisticReference } from '@data-weave/datamanager'
import { createAtom } from 'mobx'

export const ObservableOptimisticReference = <T>(sourceReference: LiveReference<T>): OptimisticReference<T> => {
    const optimistic = new OptimisticReference<T>(sourceReference)
    const atom = createAtom(
        'ObservableOptimisticLiveReference',
        () => sourceReference.resolve(),
        () => sourceReference.unsubscribe()
    )

    optimistic.registerOnChangeListener(() => atom.reportChanged())

    return new Proxy(optimistic, {
        get(target, prop, receiver) {
            if (prop === 'value' || prop === 'resolved' || prop === 'hasError' || prop === 'error') {
                atom.reportObserved()
            }

            return Reflect.get(target, prop, receiver)
        },
    })
}
