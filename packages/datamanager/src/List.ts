import { Resolvable } from './Reference'

export interface ListPaginationParams {
    readonly pageSize?: number
    readonly append?: boolean
    readonly loadFirstPageManually?: boolean
}

export interface List<T> extends Resolvable<readonly T[]> {
    readonly values: readonly T[]
}

export function createInitializedList<T>(values: ReadonlyArray<T>): List<T> {
    return {
        values,
        resolved: true,
        hasError: false,
        resolve: async () => values,
    }
}

export function createEmptyList<T>(): List<T> {
    return createInitializedList([])
}
