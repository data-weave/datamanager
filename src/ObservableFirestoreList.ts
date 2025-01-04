import { createAtom, IAtom, IObservableArray, observable, when } from 'mobx'
import { Query } from './firestoreAppCompatTypes'
import { FirestoreList, FirestoreListOptions } from './FirestoreList'

export class ObservableFirestoreList<T> extends FirestoreList<T> {
    private readonly _atom: IAtom
    protected readonly _values: IObservableArray<T> = observable.array([], {
        deep: false,
    })

    constructor(query: Query<T>, options: FirestoreListOptions<T>) {
        super(query, options)
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
