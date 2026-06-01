import { LiveList } from '@data-weave/datamanager'
import { createAtom, IAtom } from 'mobx'

const observingAtoms = Symbol('@data-weave/observableList.observingAtoms')

type Bridged<T> = LiveList<T> & { [observingAtoms]?: IAtom[] }

/**
 * Wraps a `LiveList<T>` so that MobX reactions observing `values`,
 * `resolved`, `hasError`, or `error` re-run whenever the underlying source
 * publishes a new snapshot. The atom drives `resolve` / `unsubscribe` via
 * `onBecomeObserved` / `onBecomeUnobserved`, and a one-time bridge installed
 * on the bare `onValuesChange` method propagates source updates to every
 * wrapping atom (since `FirestoreList` and other `LiveList` subclasses call
 * `this.onValuesChange()` on the bare instance, bypassing this proxy's get
 * trap). Multiple wraps of the same source are supported: each wrap registers
 * its own atom and all of them are notified on every snapshot.
 */
export const ObservableList = <T>(sourceList: LiveList<T>): LiveList<T> => {
    const atom = createAtom(
        'ObservableList',
        () => sourceList.resolve(),
        () => sourceList.unsubscribe()
    )

    // LiveList calls `this.onValuesChange()` on the
    // bare instance from inside its snapshot callback (via `onUpdate` /
    // `onUpdateAll` / `onError`). The Proxy's get trap never sees that call,
    // so we install (once per source) a bridge on the bare method that fans
    // each call out to every registered atom.
    const bridged = sourceList as Bridged<T>

    // setup the bridge if it's not already set up
    if (!bridged[observingAtoms]) {
        const atoms: IAtom[] = []
        bridged[observingAtoms] = atoms

        const original = sourceList.onValuesChange.bind(sourceList)

        sourceList.onValuesChange = () => {
            original()
            for (const atom of atoms) {
                atom.reportChanged()
            }
        }
    }
    bridged[observingAtoms].push(atom)

    return new Proxy(sourceList, {
        get(target, prop, receiver) {
            if (prop === 'values' || prop === 'resolved' || prop === 'hasError' || prop === 'error') {
                atom.reportObserved()
            }

            return Reflect.get(target, prop, receiver)
        },
    })
}
