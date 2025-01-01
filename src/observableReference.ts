import { Reference } from './reference'
import { IAtom, createAtom } from 'mobx'

export abstract class ObservableReference<T> implements Reference<T> {
    private readonly _atom: IAtom
    private _initialized: boolean = false

    constructor() {
        this._atom = createAtom(
            'ObservableReference',
            this._onBecomeObserved,
            this._onBecomeUnobserved
        )
    }

    private _onBecomeObserved() {
        console.log('onBecomeObserved')
    }

    private _onBecomeUnobserved() {
        console.log('onBecomeUnobserved')
        this._initialized = false
    }


    public get value(): T | undefined {
        return undefined
    }

    public get resolved(): boolean {
        this._atom.reportObserved();
        return this._initialized;
    }

    public async resolve(): Promise<T | undefined> {
        return undefined
    }
}
