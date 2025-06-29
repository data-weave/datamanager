import { List } from './List'

export interface LiveListOptions<T> {
    onUpdate?: (newValues: T[]) => void
    onError?: (error: unknown) => void
}

export class LiveList<T> implements List<T> {
    protected _values: T[] = []
    protected _resolved: boolean = false
    protected _hasError: boolean = false
    protected _options: LiveListOptions<T>

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

    protected onValuesChange(): void {}

    protected onUpdateAll(values: T[]): void {
        this._values = values
        this._resolved = true
        this.onValuesChange()
    }

    protected onUpdateAtIndex(index: number, value: T): void {
        this._values[index] = value
        this.onValuesChange()
    }

    protected onError(error: unknown): void {
        this._hasError = true
        this._values = []
        this._resolved = true
        this._options.onError?.(error)
        this.onValuesChange()
    }
}
