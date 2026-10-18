import type { CreateOptions, WithoutId } from '@data-weave/datamanager'
import type * as FirestoreTypes from '@firebase/firestore'
import type { Firestore as AdminFirestore, FieldValue } from '@google-cloud/firestore'

type ModularSdk = typeof import('@firebase/firestore')

export type DocumentData = FirestoreTypes.DocumentData

export { FieldValue, FirestoreTypes }

/**
 * Object-only form of the SDK's `WithFieldValue`. The SDK type is a conditional that stays unresolved
 * for a generic `T`, so it can neither be spread nor merged with the metadata fields (TS2698).
 */
export type WithFieldValue<T> = {
    [K in keyof T]: FirestoreTypes.WithFieldValue<T[K]> | FirestoreTypes.FieldValue
}

/** `WithFieldValue` whose values may also be `undefined` (partial writes; Firestore drops them). */
export type WithFieldValueOrUndefined<T> = {
    [K in keyof T]: FirestoreTypes.WithFieldValue<T[K]> | FirestoreTypes.FieldValue | undefined
}

/** Same as Partial but every key must be present (as a value or `undefined`). */
type OptionallyUndefined<T> = { [P in keyof T]: T[P] | undefined }

export type FirestoreReadMode = 'realtime' | 'static'

/**
 * Converter used inside the data manager. Unlike the public {@link FirestoreDataConverter} it also
 * receives partial objects (`update` serializes through it) and never sees `id`.
 */
export interface InternalFirestoreDataConverter<
    T extends DocumentData,
    SerializedT extends DocumentData = DocumentData,
> {
    toFirestore(
        modelObject: Partial<WithFieldValue<WithoutId<T>>>,
        options?: FirestoreTypes.SetOptions
    ): WithFieldValueOrUndefined<WithoutId<SerializedT>>
    fromFirestore(
        snapshot: FirestoreTypes.QueryDocumentSnapshot<T, SerializedT>,
        options?: FirestoreTypes.SnapshotOptions
    ): T
}

/** `Date` fields become Firestore `Timestamp`s, recursively - the shape of raw document data. */
export type WithTimestamps<T> = T extends Date
    ? FirestoreTypes.Timestamp
    : T extends FirestoreTypes.Timestamp
      ? T
      : T extends object
        ? { [K in keyof T]: WithTimestamps<T[K]> }
        : T

/**
 * Converts between the model and its serialized form. `Required` + `OptionallyUndefined` force every
 * serialized key to be listed, so optional model fields are never silently dropped.
 */
export interface FirestoreDataConverter<ModelObject, SerializedModelObject = ModelObject> {
    toFirestore(
        modelObject: WithoutId<ModelObject>,
        options?: FirestoreTypes.SetOptions
    ): OptionallyUndefined<Required<WithoutId<WithFieldValue<SerializedModelObject>>>>
    fromFirestore(
        snapshot: FirestoreTypes.QueryDocumentSnapshot<WithTimestamps<SerializedModelObject>>,
        options?: FirestoreTypes.SnapshotOptions
    ): ModelObject
}

export interface FirestoreReadOptions {
    readonly transaction?: FirestoreTypes.Transaction
}

export interface FirestoreWriteOptions {
    readonly transaction?: FirestoreTypes.Transaction
    readonly batcher?: FirestoreTypes.WriteBatch
}

export type FirebaseCreateOptions = FirestoreWriteOptions & CreateOptions

type GenNode<K extends string, IsRoot extends boolean> = IsRoot extends true ? `${K}` : `.${K}`

export type FilterableFields<
    T extends object,
    IsRoot extends boolean = true,
    K extends keyof T = keyof T,
> = K extends string
    ? // Handle firebase timestamp fields
      T[K] extends FirestoreTypes.Timestamp
        ? `${K}`
        : // Handle Date fields
          T[K] extends Date
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
      ? T[K] extends Date
          ? Date | FirestoreTypes.Timestamp
          : T[K]
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

export type AggregateFieldSpec =
    | { readonly type: 'sum' | 'average'; readonly field: string }
    | { readonly type: 'count' }

export type AggregateSpec = {
    readonly [alias: string]: AggregateFieldSpec
}

export type AggregateResult<T extends AggregateSpec> = {
    [K in keyof T]: number | null
}

/** The SDK database handle an adapter wraps: modular client SDK or Admin SDK. */
export type FirestoreApp = FirestoreTypes.Firestore | AdminFirestore

/**
 * SDK-neutral surface the data manager talks to. Query, read and write members carry the modular
 * SDK's own signatures, so `createModularFirestoreAdapter` passes the SDK functions through
 * unchanged, and `FirestoreAdminAdapter` maps them onto the Admin SDK. The constraints returned by
 * `where`/`orderBy`/`limit` are opaque: only `query` of the same adapter understands them.
 */
export interface Firestore extends Pick<
    ModularSdk,
    | 'getDocs'
    | 'getDoc'
    | 'serverTimestamp'
    | 'increment'
    | 'query'
    | 'where'
    | 'limit'
    | 'orderBy'
    | 'setDoc'
    | 'updateDoc'
    | 'deleteDoc'
    | 'doc'
    | 'onSnapshot'
> {
    readonly app: FirestoreApp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection(reference: FirestoreTypes.CollectionReference | FirestoreApp, path: string): any
    getAggregateFromServer<Spec extends AggregateSpec>(
        query: FirestoreTypes.Query,
        spec: Spec
    ): Promise<AggregateResult<Spec>>
    runTransaction<T>(
        firestore: FirestoreApp,
        updateFunction: (transaction: FirestoreTypes.Transaction) => Promise<T>,
        options?: FirestoreTypes.TransactionOptions
    ): Promise<T>
}
