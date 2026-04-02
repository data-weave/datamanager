import { IdentifiableReference, LiveReference } from '@data-weave/datamanager'
import { IAtom, createAtom, when } from 'mobx'

export class ObservableReference<T> implements IdentifiableReference<T> {
    private readonly _atom: IAtom

    constructor(private readonly sourceReference: LiveReference<T>) {
        this.sourceReference.onValueChange = () => this._atom.reportChanged()

        this._atom = createAtom(
            'ObservableReference',
            this._onBecomeObserved.bind(this),
            this._onBecomeUnobserved.bind(this)
        )
    }

    private _onBecomeObserved() {
        this.sourceReference.resolve()
    }

    private _onBecomeUnobserved() {
        this.sourceReference.unSubscribe()
    }

    public get id() {
        return this.sourceReference.id
    }

    public get value() {
        this._atom.reportObserved()
        return this.sourceReference.value
    }

    public get resolved() {
        this._atom.reportObserved()
        return this.sourceReference.resolved
    }

    public get hasError() {
        this._atom.reportObserved()
        return this.sourceReference.hasError
    }

    public get error() {
        this._atom.reportObserved()
        return this.sourceReference.error
    }

    public async resolve() {
        await when(() => this.resolved)
        return this.value
    }
}
