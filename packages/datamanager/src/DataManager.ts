import { List } from './List'
import { IdentifiableReference, WithoutId } from './Reference'

export interface ReadOptions {
    readonly transaction?: unknown
}

export interface WriteOptions {
    readonly transaction?: unknown
    readonly batcher?: unknown
}

export interface CreateOptions extends WriteOptions {
    id?: string
    merge?: boolean
}

export type OrderByOption = 'asc' | 'desc'

export interface GetListOptions {
    readonly filterBy?: unknown
    readonly orderBy?: unknown
    readonly limit?: number
}

export interface Metadata {
    readonly id: string
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly deleted: boolean
}

export type WithMetadata<T> = T & Metadata

export type NumericKeys<T> = { [K in keyof T]: T[K] extends number ? K : never }[keyof T] & string
/**
 * DataManager is the base class for all data managers.
 * It is responsible for reading, creating, deleting, and updating data.
 * It is also responsible for returning references and lists.
 * It is generic and can be used for any type of data.
 * @template T - The type of the data to be managed.
 */
export abstract class DataManager<T> {
    public abstract read(id: string): Promise<T | undefined>
    public abstract create(data: WithoutId<T>, options?: CreateOptions): Promise<IdentifiableReference<WithMetadata<T>>>
    public abstract delete(id: string): Promise<void>
    public abstract update(id: string, data: Partial<WithoutId<T>>): Promise<void>
    public abstract upsert(id: string, data: WithoutId<T>): Promise<void>

    public abstract count(params?: GetListOptions): Promise<number>
    public abstract sum(field: NumericKeys<T>, params?: GetListOptions): Promise<number>
    public abstract average(field: NumericKeys<T>, params?: GetListOptions): Promise<number | null>
    public abstract min<K extends string & keyof T>(field: K, params?: GetListOptions): Promise<T[K] | null>
    public abstract max<K extends string & keyof T>(field: K, params?: GetListOptions): Promise<T[K] | null>
    public abstract exists(id: string): Promise<boolean>

    public abstract getRef(id: string): IdentifiableReference<WithMetadata<T>>
    public abstract getList(params?: GetListOptions): List<WithMetadata<T>>
}
