import type FirestoreTypes from '@firebase/firestore'
import type { WithFieldValue as FirestoreWithFieldValue } from '@firebase/firestore'
import type { HttpsCallable, HttpsCallableOptions } from '@firebase/functions-types'
import { injectable } from 'inversify'
import { WithoutId } from './Reference'
import { Transaction, FieldValue } from '@google-cloud/firestore'

export type DocumentData = FirestoreTypes.DocumentData
// export type FieldValue = FirestoreTypes.FieldValue

export { FirestoreTypes, FieldValue, Transaction }

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
        modelObject: WithoutId<Partial<WithFieldValue<T>>>,
        options?: FirestoreTypes.SetOptions
    ): OptionallyUndefined<Required<WithoutId<WithFieldValue<SerializedT>>>>
    fromFirestore(
        snapshot: FirestoreTypes.QueryDocumentSnapshot<T, SerializedT>,
        options?: FirestoreTypes.SnapshotOptions
    ): OptionallyUndefined<Required<WithoutId<T>>>
}

// TODO: add types
/* eslint-disable @typescript-eslint/no-explicit-any */
export type FirestoreQuery = (reference: any, filter: any) => any
export type FirestoreWhere = (field: string, op: string, value: any) => any
/* eslint-enable @typescript-eslint/no-explicit-any */

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

export abstract class FieldValues {
    public abstract serverTimestamp(): FirestoreTypes.FieldValue
    public abstract delete(): FirestoreTypes.FieldValue
    public abstract increment(n: number): FirestoreTypes.FieldValue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract arrayUnion(...elements: any[]): FirestoreTypes.FieldValue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    public abstract type?: string
    public abstract toJSON?(): object
    public abstract terminate?(): Promise<void>
    public abstract settings?(settings: FirestoreAppSettings): void
    public abstract useEmulator?(host: string, port: number): void
    public abstract runTransaction?<T>(
        updateFunction: (transaction: Transaction) => Promise<T>,
        options?: FirestoreTypes.TransactionOptions
    ): Promise<T>
}

// TODO: add types
/* eslint-disable @typescript-eslint/no-explicit-any */
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
    public abstract deleteDoc(reference: any): Promise<void>
    public abstract onSnapshot(
        reference: any,
        onNext: (snapshot: any) => void,
        onError?: (error: Error) => void
    ): () => void
    public abstract runTransaction<T>(
        firestore: FirestoreApp,
        transaction: (transaction: Transaction) => Promise<T>,
        options?: FirestoreTypes.TransactionOptions
    ): Promise<T>
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
