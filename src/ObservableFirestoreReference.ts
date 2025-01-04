import { DocumentReference } from './firestoreAppCompatTypes'
import { FirestoreReference, FirestoreReferenceOptions } from './firestoreReference'
import { IAtom, createAtom, when } from 'mobx'

export class ObservableFirestoreRefence<T> extends FirestoreReference<T> {
    private readonly _atom: IAtom

    constructor(doc: DocumentReference<T>, options: FirestoreReferenceOptions<T>) {
        super(doc, options)
        this._atom = createAtom(
            'ObservableFirestoreRefence',
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

    public get value(): T | undefined {
        this._atom.reportObserved()
        return this._value
    }

    public get resolved(): boolean {
        this._atom.reportObserved()
        return this._resolved
    }

    public async resolve(): Promise<T | undefined> {
        await when(() => this.resolved)
        return this._value
    }

    protected onValueChange() {
        this._atom.reportChanged()
    }
}
