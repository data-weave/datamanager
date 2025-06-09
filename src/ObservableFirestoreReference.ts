import { createAtom, IAtom, when } from 'mobx'

import { FirestoreReference, FirestoreReferenceOptions } from './FirestoreReference'
import { DocumentData, Firestore, FirestoreTypes } from './firestoreTypes'

export class ObservableFirestoreReference<T extends DocumentData, S extends DocumentData> extends FirestoreReference<
    T,
    S
> {
    private readonly _atom: IAtom

    constructor(
        firestore: Firestore,
        doc: FirestoreTypes.DocumentReference<T, S>,
        options: FirestoreReferenceOptions<T>
    ) {
        super(firestore, doc, options)
        this._atom = createAtom(
            'ObservableFirestoreReference',
            this._onBecomeObserved.bind(this),
            this._onBecomeUnobserved.bind(this)
        )
    }

    private _onBecomeObserved() {
        super.resolve()
    }

    private _onBecomeUnobserved() {
        this._resolved = false
        this.unSubscribe()
    }

    public get value() {
        this._atom.reportObserved()
        return this._value
    }

    public get resolved() {
        this._atom.reportObserved()
        return this._resolved
    }

    public get hasError() {
        this._atom.reportObserved()
        return this._hasError
    }

    public async resolve() {
        await when(() => this.resolved)
        return this._value
    }

    protected onValueChange() {
        this._atom.reportChanged()
    }
}
