import { createAtom, IAtom, when } from 'mobx'

import { FirestoreList, FirestoreListOptions } from './FirestoreList'
import { DocumentData, FirestoreDataConverter, Query } from './FirestoreTypes'

export class ObservableFirestoreList<T> extends FirestoreList<T> {
    private readonly _atom: IAtom

    constructor(query: Query<DocumentData>, options: FirestoreListOptions<T>, converter: FirestoreDataConverter<T>) {
        super(query, options, converter)
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

    public async resolve() {
        await when(() => this.resolved)
        return this._values
    }

    protected onValuesChange() {
        this._atom.reportChanged()
    }
}
