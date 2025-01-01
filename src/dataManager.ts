import { IdentifiableReference } from './reference'

export interface CreateOptions {
    id?: string
    merge?: boolean
}

export abstract class DataManager<T> {
    public abstract read(id: string): Promise<T | undefined>
    public abstract create(data: T, options?: CreateOptions): Promise<void>
    public abstract delete(id: string): Promise<void>
    public abstract update(id: string, data: T): Promise<void>

    public abstract getRef(id: string): IdentifiableReference<T>
    public abstract upsert(id: string, data: T): Promise<void>
}
