export interface Identifiable {
    readonly id: string
}

export type WithoutId<T> = Omit<T, 'id'>

export interface Resolvable<T> {
    readonly resolved: boolean
    readonly hasError: boolean
    resolve(): Promise<T>
}

export interface Reference<T> extends Resolvable<T | undefined> {
    readonly value: T | undefined
}

export type IdentifiableReference<T> = Reference<T> & Identifiable

export function createInitializedIdentifiableReference<T>(
    value: T | undefined,
    id: string
): Reference<T> & Identifiable {
    return {
        id,
        value,
        resolved: true,
        hasError: false,
        resolve: async () => value,
    }
}

export function createEmptyIdentifiableReference<T>(id: string): Reference<T> {
    return createInitializedIdentifiableReference<T>(undefined, id)
}
