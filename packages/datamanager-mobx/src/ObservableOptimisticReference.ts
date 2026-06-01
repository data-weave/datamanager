import { LiveReference, OptimisticReference } from '@data-weave/datamanager'
import { createAtom, IAtom } from 'mobx'

const observingAtoms = Symbol('@data-weave/observableOptimisticLiveReference.observingAtoms')
type Bridged<T> = OptimisticReference<T> & { [observingAtoms]?: IAtom[] }

export interface ObservableOptimisticLiveReferenceOptions {
    clearOptimisticOnSourceUpdate?: boolean
}

export const ObservableOptimisticReference = <T>(
    sourceReference: LiveReference<T>,
    options?: ObservableOptimisticLiveReferenceOptions
): OptimisticReference<T> & LiveReference<T> => {
    const optimistic = new OptimisticReference<T>(sourceReference)
    const atom = createAtom(
        'ObservableOptimisticLiveReference',
        () => sourceReference.resolve(),
        () => sourceReference.unsubscribe()
    )

    const bridged = optimistic as Bridged<T>

    // setup the bridge if it's not already set up
    if (!bridged[observingAtoms]) {
        const atoms: IAtom[] = []
        bridged[observingAtoms] = atoms

        const original = sourceReference.onValueChange.bind(sourceReference)
        sourceReference.onValueChange = () => {
            original()
            if (options?.clearOptimisticOnSourceUpdate) {
                optimistic.clearOptimistic()
            }
            for (const atom of atoms) {
                atom.reportChanged()
            }
        }
    }

    bridged[observingAtoms].push(atom)

    const liveOptimisticRefence = optimistic as LiveReference<T> & OptimisticReference<T>

    return new Proxy(liveOptimisticRefence, {
        get(target, prop, receiver) {
            if (prop === 'value' || prop === 'resolved' || prop === 'hasError' || prop === 'error') {
                atom.reportObserved()
            }

            const value = Reflect.get(target, prop, receiver)

            // Wrap mutating methods so the reaction fires AFTER the patch is
            // applied/cleared, not when the method is merely accessed.
            if ((prop === 'applyOptimistic' || prop === 'clearOptimistic') && typeof value === 'function') {
                return (...args: Array<unknown>) => {
                    const result = value.apply(target, args)
                    atom.reportChanged()
                    return result
                }
            }

            return value
        },
    })
}
