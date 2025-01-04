import { Resolvable } from './reference'

export interface List<T> extends Resolvable<readonly T[]> {
    readonly values: readonly T[]
}
