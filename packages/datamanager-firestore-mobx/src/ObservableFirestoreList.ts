import { IAtom, createAtom, when } from 'mobx'

import {
    DocumentData,
    Firestore,
    FirestoreList,
    FirestoreListOptions,
    FirestoreTypes,
} from '@data-weave/backend-firestore/src'

export class ObservableFirestoreList<T extends DocumentData, S extends DocumentData> extends FirestoreList<T, S> {
    private readonly _atom: IAtom

    constructor(firestore: Firestore, query: FirestoreTypes.Query<T, S>, options: FirestoreListOptions<T>) {
        super(firestore, query, options)
        this._atom = createAtom(
            'ObservableFirestoreList',
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

    public get values() {
        this._atom.reportObserved()
        return super.values
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
        await when(() => this.resolved)
        return super.values
    }

    protected onValuesChange() {
        this._atom.reportChanged()
    }
}
