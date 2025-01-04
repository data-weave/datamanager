import { WithMetadata } from 'typescript'
import { IdentifiableReference } from './reference'
import { List } from './List'

export interface CreateOptions {
    id?: string
    merge?: boolean
}

export type OrderByOption = 'asc' | 'desc'

export interface GetListOptions {
    filterBy?: unknown
    orderBy?: unknown
    limit?: number
}

export abstract class DataManager<T> {
    public abstract read(id: string): Promise<T | undefined>
    public abstract create(data: T, options?: CreateOptions): Promise<IdentifiableReference<WithMetadata<T>>>
    public abstract delete(id: string): Promise<void>
    public abstract update(id: string, data: T): Promise<void>

    public abstract getRef(id: string): IdentifiableReference<T>
    public abstract getList(params?: GetListOptions): List<T>
    public abstract upsert(id: string, data: T): Promise<void>
}
