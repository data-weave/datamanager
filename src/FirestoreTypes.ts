/* eslint-disable @typescript-eslint/no-explicit-any */
import type FirestoreTypes from '@firebase/firestore'
import type { WithFieldValue as FirestoreWithFieldValue } from '@firebase/firestore'
import type { HttpsCallable, HttpsCallableOptions } from '@firebase/functions-types'
import { injectable } from 'inversify'
import { WithoutId } from './Reference'

export type DocumentData = FirestoreTypes.DocumentData
export type FieldValue = FirestoreTypes.FieldValue

export { FirestoreTypes }

/**
 * Same as Partial but all fields are required to be included
 */
type OptionallyUndefined<T> = { [P in keyof T]: T[P] | undefined }

export declare interface InternalFirestoreDataConverter<
    T extends DocumentData,
    SerializedT extends DocumentData = DocumentData,
> {
    toFirestore(
        modelObject: Partial<WithFieldValue<WithoutId<T>>>,
        options?: FirestoreTypes.SetOptions
    ): WithFieldValue<WithoutId<SerializedT>>
    fromFirestore(
        snapshot: FirestoreTypes.QueryDocumentSnapshot<T, SerializedT>,
        options?: FirestoreTypes.SnapshotOptions
    ): T
}

/**
 * Converts data between model and serialized data. Differs from InternalFirestoreDataConverter
 * by using `OptionallyUndefined` and `Required` to ensure that all fields are included in de/serialization
 * even if some model defined properties are optional.
 */
export declare interface FirestoreDataConverter<
    T extends DocumentData,
    SerializedT extends DocumentData = DocumentData,
> {
    toFirestore(
        modelObject: Partial<WithFieldValue<WithoutId<T>>>,
        options?: FirestoreTypes.SetOptions
    ): OptionallyUndefined<Required<WithFieldValue<WithoutId<SerializedT>>>>
    fromFirestore(
        snapshot: FirestoreTypes.QueryDocumentSnapshot<T, SerializedT>,
        options?: FirestoreTypes.SnapshotOptions
    ): OptionallyUndefined<Required<WithoutId<T>>>
}

// TODO:
export type FirestoreQuery = (reference: any, filter: any) => any
export type FirestoreWhere = (field: string, op: string, value: any) => any

export type FirestoreReadMode = 'realtime' | 'static'

export interface FirestoreReadOptions {
    readonly transaction?: FirestoreTypes.Transaction
}

export interface FirestoreWriteOptions {
    readonly transaction?: FirestoreTypes.Transaction
    readonly batcher?: FirestoreTypes.WriteBatch
}

export interface FirebaseCreateOptions extends FirestoreWriteOptions {
    id?: string
    merge?: boolean
}

export declare type WithFieldValue<T> = {
    [K in keyof T]: FirestoreWithFieldValue<T[K]> | FirestoreTypes.FieldValue
}

type GenNode<K extends string, IsRoot extends boolean> = IsRoot extends true ? `${K}` : `.${K}`

export type FilterableFields<
    T extends object,
    IsRoot extends boolean = true,
    K extends keyof T = keyof T,
> = K extends string
    ? // Handle firebase timestamp fields
      T[K] extends FirestoreTypes.Timestamp
        ? `${K}`
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          T[K] extends any[]
          ? GenNode<K, IsRoot>
          : T[K] extends object
            ? `${GenNode<K, IsRoot>}${FilterableFields<T[K], false>}`
            : GenNode<K, IsRoot>
    : never

type GetValue<T, K extends string> = K extends `${infer L}.${infer R}`
    ? L extends keyof T
        ? GetValue<T[L], R>
        : never
    : K extends keyof T
      ? T[K]
      : K extends string
        ? string | number | boolean
        : never

export type PrimitiveFilterOp = '<' | '<=' | '==' | '!=' | '>=' | '>'

export type FilterBy<T extends object, Field extends string = FilterableFields<T>> = Field extends string
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      GetValue<T, Field> extends any[]
        ? [Field, 'array-contains', string] | [Field, 'array-contains-any', string[]]
        : [Field, PrimitiveFilterOp, GetValue<T, Field>] | [Field, 'in', string[]]
    : never

export type OrderBy<T extends DocumentData, Fields extends string = FilterableFields<T>> = [
    Fields,
    FirestoreTypes.OrderByDirection,
]

export abstract class FieldValueClass {
    public abstract serverTimestamp(): FirestoreTypes.FieldValue
    public abstract delete(): FirestoreTypes.FieldValue
    public abstract increment(n: number): FirestoreTypes.FieldValue
    public abstract arrayUnion(...elements: any[]): FirestoreTypes.FieldValue
    public abstract arrayRemove(...elements: any[]): FirestoreTypes.FieldValue
}

/**********
 *
 *
 * INJECTABLES
 *
 *
 * **********/

export interface FirestoreAppSettings {
    persistence?: boolean
    cacheSizeBytes?: number
    host?: string
    ssl?: boolean
    ignoreUndefinedProperties?: boolean
    serverTimestampBehavior?: 'estimate' | 'previous' | 'none'
}

export abstract class FirestoreApp {
    public abstract terminate(): Promise<void>
    public abstract settings(settings: FirestoreAppSettings): void
    public abstract useEmulator?(host: string, port: number): void
}

// TODO: add types
@injectable()
export abstract class Firestore {
    public abstract app: FirestoreApp
    public abstract collection(reference: any, path: string): any
    public abstract getDocs(reference: any): Promise<any>
    public abstract getDoc(reference: any, path?: string): Promise<any>
    public abstract serverTimestamp(): FirestoreTypes.FieldValue
    public abstract increment(n: number): FirestoreTypes.FieldValue
    public abstract query(reference: any, filter: any): any
    public abstract where(field: string, op: string, value: any): any
    public abstract limit(limit: number): any
    public abstract orderBy(orderBy: string, direction: FirestoreTypes.OrderByDirection): any
    public abstract setDoc(reference: any, data: any, options?: FirestoreTypes.SetOptions): Promise<void>
    public abstract updateDoc(reference: any, data: any): Promise<void>
    public abstract doc(reference: any, path?: string): any
    public abstract onSnapshot(
        reference: any,
        onNext: (snapshot: any) => void,
        onError?: (error: Error) => void
    ): () => void
    public abstract runTransaction(
        firestore: FirestoreApp,
        transaction: (transaction: any) => Promise<any>
    ): Promise<any>
}

// TODO: add types
export class FirestoreNamespaced extends Firestore {
    public app: FirestoreApp
    constructor(
        readonly firestore: FirestoreApp,
        readonly FieldValue: FieldValueClass
    ) {
        super()
        this.app = firestore
        this.FieldValue = FieldValue
    }

    public collection(reference: any, path: string) {
        return reference.collection(path)
    }

    public getDocs(reference: any) {
        return reference.get()
    }

    public getDoc(reference: any, path?: string) {
        return reference.get(path)
    }

    public serverTimestamp() {
        return this.FieldValue.serverTimestamp()
    }

    public increment(n: number) {
        return this.FieldValue.increment(n)
    }

    public query(reference: any, filter: any) {
        if (filter.type === 'where') {
            return reference.where(filter.field, filter.op, filter.value)
        }
        if (filter.type === 'orderBy') {
            return reference.orderBy(filter.field, filter.direction)
        }
        if (filter.type === 'limit') {
            return reference.limit(filter.limit)
        }
    }

    public where(field: string, op: string, value: any) {
        return {
            type: 'where',
            field,
            op,
            value,
        }
    }

    public limit(limit: number) {
        return {
            type: 'limit',
            limit,
        }
    }

    public orderBy(orderBy: string, direction: FirestoreTypes.OrderByDirection) {
        return {
            type: 'orderBy',
            orderBy,
            direction,
        }
    }

    public setDoc(reference: any, data: any, options?: FirestoreTypes.SetOptions) {
        return reference.set(data, options)
    }

    public updateDoc(reference: any, data: any) {
        return reference.update(data)
    }

    public doc(reference: any, path?: string) {
        return reference.doc(path)
    }

    public onSnapshot(reference: any, onNext: (snapshot: any) => void, onError?: (error: Error) => void) {
        return reference.onSnapshot(onNext, onError)
    }

    public runTransaction(firestore: any, transaction: (transaction: any) => Promise<any>) {
        return firestore.runTransaction(transaction)
    }
}

@injectable()
export abstract class FirestoreSettings {
    public abstract readMode: FirestoreReadMode
}

@injectable()
export abstract class FirestoreFunctions {
    public abstract httpsCallable(name: string, options?: HttpsCallableOptions): HttpsCallable
    public abstract useEmulator(host: string, port: number): void
    public abstract useFunctionsEmulator(origin: string): void
}

@injectable()
export class DummyFirestoreFunctions implements FirestoreFunctions {
    public httpsCallable(): HttpsCallable {
        return () => {
            throw new Error('httpsCallable not implemented - DummyFirestoreFunctions')
        }
    }
    public useEmulator() {}
    public useFunctionsEmulator() {}
}

export const isFieldValue = (value: any): value is FirestoreTypes.FieldValue => {
    return value !== undefined && typeof value._toFieldTransform === 'function'
}
