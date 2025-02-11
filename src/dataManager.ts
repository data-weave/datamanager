import { IdentifiableReference, WithoutId } from './reference'
import { List } from './List'

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
    filterBy?: unknown
    orderBy?: unknown
    limit?: number
}

export interface Metadata {
    readonly id: string
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly deleted: boolean
}

export type WithMetadata<T> = T & Metadata

export abstract class DataManager<T> {
    public abstract read(id: string, options?: ReadOptions): Promise<WithMetadata<T> | undefined>
    public abstract create(data: WithoutId<T>, options?: CreateOptions): Promise<IdentifiableReference<WithMetadata<T>>>
    public abstract delete(id: string): Promise<void>
    public abstract update(id: string, data: Partial<WithoutId<T>>, options?: WriteOptions): Promise<void>

    public abstract getRef(id: string): IdentifiableReference<WithMetadata<T>>
    public abstract getList(params?: GetListOptions): List<WithMetadata<T>>
    public abstract upsert(id: string, data: WithoutId<T>, options?: WriteOptions): Promise<void>
}
