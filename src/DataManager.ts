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

type DocumentData = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [field: string]: any
}

export type WithMetadata<T extends DocumentData> = T & Metadata
export abstract class DataManager<T extends DocumentData> {
    public abstract read(id: string): Promise<T | undefined>
    public abstract create(data: WithoutId<T>, options?: CreateOptions): Promise<IdentifiableReference<WithMetadata<T>>>
    public abstract delete(id: string): Promise<void>
    public abstract update(id: string, data: Partial<WithoutId<T>>): Promise<void>
    public abstract upsert(id: string, data: WithoutId<T>): Promise<void>

    public abstract getRef(id: string): IdentifiableReference<WithMetadata<T>>
    public abstract getList(params?: GetListOptions): List<WithMetadata<T>>
}
