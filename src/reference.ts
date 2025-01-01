export interface Identifiable {
    readonly id: string
}

export interface Resolvable<T> {
    readonly resolved: boolean
    resolve(): Promise<T>
}

export interface Reference<T> extends Resolvable<T | undefined> {
    readonly value: T | undefined
}

export type IdentifiableReference<T> = Reference<T> & Identifiable
