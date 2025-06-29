import { Reference } from '../../datamanager-firestore-mobx/lib'

export interface LiveReferenceOptions<T> {
    onUpdate?: (newValue: T | undefined) => void
    onError?: (error: unknown) => void
}

export class LiveReference<T> implements Reference<T> {
    private _value: T | undefined
    private _resolved: boolean = false
    private _hasError: boolean = false
    private _options: LiveReferenceOptions<T>

    resolve(): Promise<T | undefined> {
        throw new Error('Method not implemented.')
    }

    constructor(readonly options: LiveReferenceOptions<T>) {
        this._value = undefined
        this._resolved = false
        this._hasError = false
        this._options = options
    }

    public get value(): T | undefined {
        return this._value
    }

    public get resolved() {
        return this._resolved
    }

    public get hasError() {
        return this._hasError
    }

    protected setStale() {
        this._resolved = false
    }

    protected onUpdate(data: T | undefined): void {
        this._value = data
        this._resolved = true
        this.onValueChange()
        this._options.onUpdate?.(this._value)
    }

    protected onError(error: unknown) {
        this._hasError = true
        this._value = undefined
        this._resolved = true
        this.onValueChange()
        this._options.onError?.(error)
    }

    protected onValueChange(): void {}
}
