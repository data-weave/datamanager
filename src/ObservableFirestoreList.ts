import { createAtom, IAtom, when } from 'mobx'

import { FirestoreList, FirestoreListOptions } from './FirestoreList'
import { DocumentData, Firestore, FirestoreTypes } from './FirestoreTypes'

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
        this._resolved = false
        this.unSubscribe()
    }

    public get values() {
        this._atom.reportObserved()
        return this._values
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
        return this._values
    }

    protected onValuesChange() {
        this._atom.reportChanged()
    }
}
