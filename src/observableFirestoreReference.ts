import { DocumentReference } from './firestoreAppCompatTypes'
import { FirestoreReference, FirestoreReferenceOptions } from './firestoreReference'
import { IAtom, createAtom } from 'mobx'

export class ObservableFirestoreRefence<T> extends FirestoreReference<T> {
    private readonly _atom: IAtom

    constructor(
        doc: DocumentReference<T>,
        options: FirestoreReferenceOptions
    ) {
        super(doc, options)
        this._atom = createAtom(
            'ObservableFirestoreRefence',
            this._onBecomeObserved,
            this._onBecomeUnobserved
        )
    }

    private _onBecomeObserved() {
        this.resolve()
    }

    private _onBecomeUnobserved() {
        this.resolved = false
        this.unSubscribe()
    }


    protected setValue(value: T | undefined) {
        super.setValue(value)
        this._atom.reportChanged()
    }
}
