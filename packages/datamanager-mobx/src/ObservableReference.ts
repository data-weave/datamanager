import { LiveReference } from '@data-weave/datamanager'
import { createAtom, IAtom } from 'mobx'

const observingAtoms = Symbol('@data-weave/observableReference.observingAtoms')

type Bridged<T> = LiveReference<T> & { [observingAtoms]?: IAtom[] }

/**
 * Wraps a `LiveReference<T>` so that MobX reactions observing `value`,
 * `resolved`, `hasError`, or `error` re-run whenever the underlying source
 * publishes a new value. The atom drives `resolve` / `unsubscribe` via
 * `onBecomeObserved` / `onBecomeUnobserved`, and a one-time bridge installed
 * on the bare `onValueChange` method propagates source updates to every
 * wrapping atom (since `FirestoreReference` and other `LiveReference`
 * subclasses call `this.onValueChange()` on the bare instance, bypassing
 * this proxy's get trap). Multiple wraps of the same source are supported:
 * each wrap registers its own atom and all of them are notified on every
 * publish.
 */
export const ObservableReference = <T>(sourceReference: LiveReference<T>): LiveReference<T> => {
    const atom = createAtom(
        'ObservableReference',
        () => sourceReference.resolve(),
        () => sourceReference.unsubscribe()
    )

    // LiveReference calls `this.onUpdate(...)`
    // on the bare instance from inside its snapshot callback, which then
    // calls `this.onValueChange()` on the bare instance too. The Proxy's
    // get trap never sees that call, so we install (once per source) a
    // bridge on the bare method that fans each call out to every
    // registered atom.
    const bridged = sourceReference as Bridged<T>

    // setup the bridge if it's not already set up
    if (!bridged[observingAtoms]) {
        const atoms: IAtom[] = []
        bridged[observingAtoms] = atoms

        const original = sourceReference.onValueChange.bind(sourceReference)
        sourceReference.onValueChange = () => {
            original()
            for (const atom of atoms) {
                atom.reportChanged()
            }
        }
    }

    bridged[observingAtoms].push(atom)

    return new Proxy(sourceReference, {
        get(target, prop, receiver) {
            if (prop === 'value' || prop === 'resolved' || prop === 'hasError' || prop === 'error') {
                atom.reportObserved()
            }

            return Reflect.get(target, prop, receiver)
        },
    })
}
