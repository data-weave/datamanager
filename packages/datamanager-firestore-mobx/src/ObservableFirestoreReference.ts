import { IAtom, createAtom } from 'mobx'

import {
    DocumentData,
    Firestore,
    FirestoreReference,
    FirestoreReferenceOptions,
    FirestoreTypes,
} from '@data-weave/backend-firestore/src'

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
        this.unSubscribe()
    }

    public get value() {
        this._atom.reportObserved()
        return super.value
    }

    public get resolved() {
        this._atom.reportObserved()
        return super.resolved
    }

    public get hasError() {
        this._atom.reportObserved()
        return super.hasError
    }

    public async resolve() {
        return super.resolve()
    }

    protected onValueChange() {
        this._atom.reportChanged()
    }
}
