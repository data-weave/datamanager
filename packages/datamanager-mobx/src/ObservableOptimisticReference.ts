import { LiveReference, OptimisticReference } from '@data-weave/datamanager'
import { createAtom } from 'mobx'
import { ObservableReference } from './ObservableReference'

export type ObservableOptimisticReference<T extends object> = OptimisticReference<T>

/**
 * Wraps a `LiveReference<T>` with optimistic patch support and MobX
 * reactivity. Source-value reactivity is provided by `ObservableReference`;
 * a separate atom owned by this factory tracks `_patch` mutations made via
 * `applyOptimistic` / `clearOptimistic` so that MobX reactions observing
 * `value` (or `hasPendingOptimistic`) re-run when the optimistic overlay
 * changes.
 */
export const ObservableOptimisticReference = <T extends object>(source: LiveReference<T>): OptimisticReference<T> => {
    const observableSource = ObservableReference(source)
    const optimistic = new OptimisticReference<T>(observableSource)
    const patchAtom = createAtom('ObservableOptimisticReference')

    return new Proxy(optimistic, {
        get(target, prop, receiver) {
            if (prop === 'value' || prop === 'hasPendingOptimistic') {
                patchAtom.reportObserved()
            }

            const value = Reflect.get(target, prop, receiver)

            if (prop === 'applyOptimistic' || prop === 'clearOptimistic') {
                return (...args: unknown[]) => {
                    const result = value.apply(target, args)
                    patchAtom.reportChanged()
                    return result
                }
            }

            return value
        },
    })
}
