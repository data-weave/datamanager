import { LiveReference, LiveReferenceOptions } from './LiveReference'

export type Patch<T> = Partial<T> | ((current: T) => Partial<T>)

interface OptimisticReferenceOptions<T> extends LiveReferenceOptions<T> {
    clearOptimisticOnSourceUpdate?: boolean
}

export class OptimisticReference<T> extends LiveReference<T> {
    private _patch: Partial<T> | undefined
    private _opts: OptimisticReferenceOptions<T>
    constructor(
        private readonly source: LiveReference<T>,
        options: LiveReferenceOptions<T> = {}
    ) {
        super(source.id, options)
        this.source.registerOnChangeListener(() => this.notifyChange())
        this._opts = options
    }

    public get value(): T | undefined {
        const base = this.source.value
        if (!this._patch) return base
        if (!base) return this._patch as T
        return { ...base, ...this._patch }
    }

    public get resolved(): boolean {
        return this.source.resolved
    }

    public get hasError(): boolean {
        return this.source.hasError
    }

    public get error(): unknown | undefined {
        return this.source.error
    }

    public async resolve(): Promise<T | undefined> {
        await this.source.resolve()
        return this.value
    }

    protected onUpdate(data: T | undefined): void {
        if (this._opts.clearOptimisticOnSourceUpdate) {
            this.clearOptimistic()
        }
        super.onUpdate(data)
    }

    applyOptimistic(patch: Patch<T>): void {
        const current = this.value ?? ({} as T)
        const resolved = typeof patch === 'function' ? patch(current) : patch
        this._patch = { ...this._patch, ...resolved }
        this.notifyChange()
    }

    clearOptimistic(): void {
        this._patch = undefined
        this.notifyChange()
    }

    get hasPendingOptimistic(): boolean {
        return this._patch !== undefined
    }

    public unsubscribe(): void {
        this.source.unsubscribe()
    }
}
