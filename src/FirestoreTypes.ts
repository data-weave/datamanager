import { WithFieldValue } from '@firebase/firestore'
import type FirestoreTypes from '@firebase/firestore-types'
import { WithoutId } from './reference'

export type DocumentData = FirestoreTypes.DocumentData

export type QueryDocumentSnapshot<T = DocumentData> = FirestoreTypes.QueryDocumentSnapshot<T>
export type Query<T = DocumentData> = FirestoreTypes.Query<T>
export type DocumentChange<T = DocumentData> = FirestoreTypes.DocumentChange<T>
export type DocumentSnapshot<T = DocumentData> = FirestoreTypes.DocumentSnapshot<T>
export type DocumentReference<T = DocumentData> = FirestoreTypes.DocumentReference<T>
export type CollectionReference<T = DocumentData> = FirestoreTypes.CollectionReference<T>
// export type FirestoreDataConverter<T> = FirestoreTypes.FirestoreDataConverter<T>
export type FirebaseFirestore = FirestoreTypes.FirebaseFirestore
export type SnapshotOptions = FirestoreTypes.SnapshotOptions
export type SetOptions = FirestoreTypes.SetOptions
export type FieldValue = typeof FirestoreTypes.FieldValue
export type WhereFilterOp = FirestoreTypes.WhereFilterOp
export type OrderByDirection = FirestoreTypes.OrderByDirection
export type Transaction = FirestoreTypes.Transaction
export type Batcher = FirestoreTypes.WriteBatch

export { WithFieldValue }

export type FirestoreReadMode = 'realtime' | 'static'

export interface FirebaseReadOptions {
    readonly transaction?: Transaction
}

export interface FirebaseWriteOptions {
    readonly transaction?: Transaction
    readonly batcher?: Batcher
}

export interface FirebaseCreateOptions extends FirebaseWriteOptions {
    id?: string
    merge?: boolean
}

export type FirebaseWriteData<T> = WithoutId<WithFieldValue<T>>

// Custom data converter since the default one
export interface FirestoreDataConverter<T> {
    /**
     * Called by the Firestore SDK to convert a custom model object of type T
     * into a plain JavaScript object (suitable for writing directly to the
     * Firestore database). To use `set()` with `merge` and `mergeFields`,
     * `toFirestore()` must be defined with `Partial<T>`.
     */
    toFirestore(modelObject: FirebaseWriteData<T>): DocumentData
    toFirestore(modelObject: Partial<FirebaseWriteData<T>>, options: SetOptions): Partial<DocumentData>

    /**
     * Called by the Firestore SDK to convert Firestore data into an object of
     * type T. You can access your data by calling: `snapshot.data(options)`.
     *
     * @param snapshot A QueryDocumentSnapshot containing your data and metadata.
     * @param options The SnapshotOptions from the initial call to `data()`.
     */
    fromFirestore(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions): T
}

export const converterSnapshotToData = <T>(snapshot: QueryDocumentSnapshot, options?: SnapshotOptions) => {
    return snapshot.data(options) as SerializeRefs<T>
}

// Parser for data fields that can be used to filter queries
export type FilterableFields<T> = {
    [K in keyof T]: T[K] extends string | number | boolean | Date | null | undefined
        ? K
        : T[K] extends Array<any>
          ? never
          : T[K] extends object
            ? never
            : K
}[keyof T] &
    string

type GetValue<T, K extends string> = K extends `${infer L}.${infer R}`
    ? L extends keyof T
        ? GetValue<T[L], R>
        : never
    : K extends keyof T
      ? T[K]
      : // eslint-disable-next-line @typescript-eslint/no-unused-vars
        K extends `${infer _}Id`
        ? string
        : never

export type FilterBy<T, Fields extends string = FilterableFields<WithoutId<T>>> = Fields extends string
    ? [Fields, WhereFilterOp, GetValue<T, Fields>]
    : never

export type OrderBy<T, Fields extends string = FilterableFields<T>> = [Fields, OrderByDirection]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SerializeRefs<T> = T extends readonly any[] // handle arrays
    ? {
          [K in keyof T]: SerializeRefs<T[K]>
      }
    : // eslint-disable-next-line @typescript-eslint/no-explicit-any
      T extends Record<any, any>
      ? {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            [key in keyof T as key extends `${infer F}Ref` ? `${F}Id` : key]: key extends `${infer _}Ref`
                ? string
                : SerializeRefs<T[key]>
        }
      : T
