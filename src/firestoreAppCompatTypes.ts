import firebase from 'firebase/compat/app'
import { WithFieldValue } from '@firebase/firestore'

export type DocumentData = firebase.firestore.DocumentData

export type QueryDocumentSnapshot<T = DocumentData> = firebase.firestore.QueryDocumentSnapshot<T>
export type Query<T = DocumentData> = firebase.firestore.Query<T>
export type DocumentChange<T = DocumentData> = firebase.firestore.DocumentChange<T>
export type DocumentReference<T = DocumentData> = firebase.firestore.DocumentReference<T>
export type CollectionReference<T = DocumentData> = firebase.firestore.CollectionReference<T>
// export type FirestoreDataConverter<T> = firebase.firestore.FirestoreDataConverter<T>
export type Firestore = firebase.firestore.Firestore
export type SnapshotOptions = firebase.firestore.SnapshotOptions
export type SetOptions = firebase.firestore.SetOptions
export type FieldValue = typeof firebase.firestore.FieldValue
export type WhereFilterOp = firebase.firestore.WhereFilterOp
export type OrderByDirection = firebase.firestore.OrderByDirection

export { WithFieldValue }

export type FirestoreReadMode = 'realtime' | 'static'

// Custom data converter since the default one
export interface FirestoreDataConverter<Data, Serialized = DocumentData> {
    /**
     * Called by the Firestore SDK to convert a custom model object of type T
     * into a plain JavaScript object (suitable for writing directly to the
     * Firestore database). To use `set()` with `merge` and `mergeFields`,
     * `toFirestore()` must be defined with `Partial<T>`.
     */
    toFirestore(modelObject: Data): DocumentData
    toFirestore(modelObject: Partial<Data>, options: SetOptions): Partial<Serialized>

    /**
     * Called by the Firestore SDK to convert Firestore data into an object of
     * type T. You can access your data by calling: `snapshot.data(options)`.
     *
     * @param snapshot A QueryDocumentSnapshot containing your data and metadata.
     * @param options The SnapshotOptions from the initial call to `data()`.
     */
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Data
}

// Parser for data fields that can be used to filter queries
export type FilterableFields<T, IsNested = false, K extends keyof T = keyof T> = K extends string
    ? `${IsNested extends true ? `.${K}` : K}${T[K] extends unknown[] ? never : T[K] extends object ? FilterableFields<T[K], true> : ''}`
    : never

type GetValue<T, K extends string> = K extends `${infer L}.${infer R}`
    ? L extends keyof T
        ? GetValue<T[L], R>
        : never
    : K extends keyof T
      ? T[K]
      : never

export type FilterBy<T, Fields extends string = FilterableFields<T>> = Fields extends string
    ? [Fields, WhereFilterOp, GetValue<T, Fields>]
    : never

export type OrderBy<T, Fields extends string = FilterableFields<T>> = [Fields, OrderByDirection]
