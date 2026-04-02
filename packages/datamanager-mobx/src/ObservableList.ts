import { List, LiveList } from '@data-weave/datamanager'
import { IAtom, createAtom, when } from 'mobx'

export class ObservableList<T> implements List<T> {
    private readonly _atom: IAtom

    constructor(private readonly sourceList: LiveList<T>) {
        this.sourceList.onValuesChange = () => this._atom.reportChanged()

        this._atom = createAtom(
            'ObservableList',
            this._onBecomeObserved.bind(this),
            this._onBecomeUnobserved.bind(this)
        )
    }

    private _onBecomeObserved() {
        this.sourceList.resolve()
    }

    private _onBecomeUnobserved() {
        this.sourceList.unSubscribe()
    }

    public get values() {
        this._atom.reportObserved()
        return this.sourceList.values
    }

    public get resolved() {
        this._atom.reportObserved()
        return this.sourceList.resolved
    }

    public get hasError() {
        this._atom.reportObserved()
        return this.sourceList.hasError
    }

    public get error() {
        this._atom.reportObserved()
        return this.sourceList.error
    }

    public async resolve() {
        await when(() => this.resolved)
        return this.values
    }
}
