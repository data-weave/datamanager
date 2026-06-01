import type { Reference } from './Reference'

export type Patch<T> = Partial<T> | ((current: T) => Partial<T>)

export class OptimisticReference<T> implements Reference<T> {
    private _patch: Partial<T> | undefined

    constructor(private readonly source: Reference<T>) {}

    get value(): T | undefined {
        const base = this.source.value
        if (!this._patch) return base
        if (!base) return this._patch as T
        return { ...base, ...this._patch }
    }

    get resolved(): boolean {
        return this.source.resolved
    }

    get hasError(): boolean {
        return this.source.hasError
    }

    get error(): unknown | undefined {
        return this.source.error
    }

    resolve(): Promise<T | undefined> {
        return this.source.resolve()
    }

    applyOptimistic(patch: Patch<T>): void {
        const current = this.value ?? ({} as T)
        const resolved = typeof patch === 'function' ? patch(current) : patch
        this._patch = { ...this._patch, ...resolved }
    }

    clearOptimistic(): void {
        this._patch = undefined
    }

    get hasPendingOptimistic(): boolean {
        return this._patch !== undefined
    }

    dispose(): void {}
}
