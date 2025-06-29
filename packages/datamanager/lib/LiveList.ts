import { List } from './List'

export interface LiveListOptions<T> {
    onUpdate?: (newValues: T[]) => void
    onError?: (error: unknown) => void
}

export class LiveList<T> implements List<T> {
    private _values: T[] = []
    private _resolved: boolean = false
    private _hasError: boolean = false
    private _options: LiveListOptions<T>

    constructor(options: LiveListOptions<T>) {
        this._options = options
    }

    resolve(): Promise<readonly T[]> {
        throw new Error('Method not implemented.')
    }

    public get values() {
        return this._values
    }

    public get hasError() {
        return this._hasError
    }

    public get resolved() {
        return this._resolved
    }

    protected setStale() {
        this._resolved = false
    }

    protected onValuesChange(): void {}

    protected onUpdate(): void {
        this._resolved = true
        this.onValuesChange()
        this._options.onUpdate?.(this._values)
    }

    protected onUpdateAll(values: T[]): void {
        this._values = values
        this.onUpdate()
    }

    protected onUpdateAtIndex(index: number, value: T): void {
        this._values[index] = value
    }

    protected onAddAtIndex(index: number, value: T): void {
        this._values.splice(index, 0, value)
    }

    protected onRemoveAtIndex(index: number): void {
        this._values.splice(index, 1)
    }

    protected onError(error: unknown): void {
        this._hasError = true
        this._values = []
        this._resolved = true
        this._options.onError?.(error)
        this.onValuesChange()
    }
}
