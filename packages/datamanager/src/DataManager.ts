import { List } from './List'
import { IdentifiableReference } from './Reference'

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

type IsNested<T> = {
    [K in keyof T]-?: T[K] extends Record<string, unknown> ? K : never
}[keyof T]

type IsOptional<T> = {
    [K in keyof T]-?: object extends Pick<T, K> ? K : never
}[keyof T]

export type CreateData<T> = {
    [K in keyof T]-?: K extends 'id'
        ? never
        : K extends IsNested<Required<T>>
          ? CreateData<T[K]> | null
          : K extends IsOptional<T>
            ? T[K] | null
            : T[K]
}

export type UpdateData<T> = Partial<CreateData<T>>
/**
 * DataManager is the base class for all data managers.
 * It is responsible for reading, creating, deleting, and updating data.
 * It is also responsible for returning references and lists.
 * It is generic and can be used for any type of data.
 * @template T - The type of the data to be managed.
 */
export abstract class DataManager<T> {
    public abstract read(id: string): Promise<WithMetadata<T> | undefined>
    public abstract create(
        data: CreateData<T>,
        options?: CreateOptions
    ): Promise<IdentifiableReference<WithMetadata<T>>>
    public abstract delete(id: string): Promise<void>
    public abstract update(id: string, data: UpdateData<T>): Promise<void>
    public abstract upsert(id: string, data: CreateData<T>): Promise<void>

    public abstract getRef(id: string): IdentifiableReference<WithMetadata<T>>
    public abstract getList(params?: GetListOptions): List<WithMetadata<T>>
}
