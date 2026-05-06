import type { Reference } from './Reference'

export type Patch<T> = Partial<T> | ((current: T) => Partial<T>)

export class OptimisticReference<T extends object> implements Reference<T> {
    private _patch: Partial<T> | undefined

    constructor(private readonly source: Reference<T>) {}

    get value(): T | undefined {
        const base = this.source.value
        if (this._patch !== undefined && base !== undefined && this.patchMatches(base, this._patch)) {
            // Source has caught up to the optimistic write; safe to discard.
            this._patch = undefined
        }
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

    private patchMatches(base: T, patch: Partial<T>): boolean {
        for (const key of Object.keys(patch) as (keyof T)[]) {
            if (!Object.is(base[key], patch[key])) return false
        }
        return true
    }
}
