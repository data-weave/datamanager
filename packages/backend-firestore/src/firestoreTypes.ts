import type {
    collection,
    deleteDoc,
    doc,
    DocumentData,
    FieldPath,
    FieldValue,
    Firestore as FirebaseFirestore,
    WithFieldValue as FirestoreWithFieldValue,
    getDoc,
    getDocs,
    increment,
    limit,
    NestedUpdateFields,
    onSnapshot,
    orderBy,
    OrderByDirection,
    query,
    Query,
    QueryDocumentSnapshot,
    QueryFieldFilterConstraint,
    runTransaction,
    serverTimestamp,
    setDoc,
    SetOptions,
    SnapshotOptions,
    Timestamp,
    Transaction,
    TransactionOptions,
    updateDoc,
    where,
    WhereFilterOp,
    WriteBatch,
} from '@firebase/firestore'

export type {
    collection,
    CollectionReference,
    deleteDoc,
    doc,
    DocumentChange,
    DocumentData,
    DocumentReference,
    DocumentSnapshot,
    FieldPath,
    FieldValue,
    getDoc,
    getDocs,
    increment,
    limit,
    NestedUpdateFields,
    onSnapshot,
    orderBy,
    OrderByDirection,
    query,
    Query,
    QueryDocumentSnapshot,
    QueryFieldFilterConstraint,
    runTransaction,
    serverTimestamp,
    setDoc,
    SetOptions,
    SnapshotOptions,
    Timestamp,
    Transaction,
    TransactionOptions,
    updateDoc,
    where,
    WhereFilterOp,
    WriteBatch,
    // UpdateData,
} from '@firebase/firestore'


export declare type Primitive = string | number | boolean | undefined | null;


type UpdateFields<T> =
    T extends Record<string, unknown>
        ? {
              [K in keyof T]?: UpdateFields<T[K]> | null
          } & NestedUpdateFields<T>
        : Partial<T>

type Nullable<T> = { [P in keyof T]: T[P] | null }

export type ConverterToFirestore<T> = WithFieldValue<Nullable<UpdateFields<T>>>

type UpdateDataChild<T> = T extends Record<string, unknown>
? {
    [K in keyof T]?: T[K] extends Record<string, unknown> ? UpdateDataChild<T[K]> | null : T[K] | FieldValue | null
} : Partial<T | null>;

export type UpdateData<T> = {
    [K in keyof T]?: T[K] extends Record<string, unknown> ? UpdateDataChild<T[K]> | null : T[K] | FieldValue | null
}

type Test = {
    a: string
    b: {
        c: string
        f: number
        g: Date
        d?: {
            e: string
        }
    }
}

// type Test2 = ConverterToFirestore<Test>

// const _: Test2 = {
//     a: 'test',
//     b: {
//         c: 'test',
//     },
//     'b.c': 'test',
// }

type Test3 = UpdateData<Test>

const __: Test3 = {
    a: 'test',
    b: {
        c: 'test',
        f: 1,
        g: new Date(),
        d: {
            e: 'test',
        }
    },
    // 'b.c': 'test',
}

export type WithTimestamps<T> = {
    [K in keyof T]: T[K] extends Date
        ? Timestamp
        : T[K] extends Record<string, unknown>
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            T[K] extends any[]
              ? T[K] extends (infer U)[]
                  ? WithTimestamps<U>[]
                  : T[K]
              : WithTimestamps<T[K]>
          : T[K]
}

/**
 * Converts data between model and serialized data. Differs from InternalFirestoreDataConverter
 * by using `OptionallyUndefined` and `Required` to ensure that all fields are included in de/serialization
 * even if some model defined properties are optional.
 */
export declare interface FirestoreDataConverter<Object, SerializedObject = Object> {
    toFirestore(modelObject: UpdateData<Object>, options?: SetOptions): ConverterToFirestore<SerializedObject>
    fromFirestore(snapshot: QueryDocumentSnapshot<WithTimestamps<SerializedObject>>, options?: SnapshotOptions): Object
}

export type FirestoreQuery<AppModelType = DocumentData, DbModelType extends DocumentData = DocumentData> = (
    reference: Query<AppModelType, DbModelType>,
    filter: QueryFieldFilterConstraint
) => Query<AppModelType, DbModelType>

export type FirestoreWhere = (
    field: string | FieldPath,
    op: WhereFilterOp,
    value: unknown
) => QueryFieldFilterConstraint

export type FirestoreReadMode = 'realtime' | 'static'

export interface FirestoreReadOptions {
    readonly transaction?: Transaction
}

export interface FirestoreWriteOptions {
    readonly transaction?: Transaction
    readonly batcher?: WriteBatch
}

export interface FirebaseCreateOptions extends FirestoreWriteOptions {
    id?: string
    merge?: boolean
}

export declare type WithFieldValue<T> = {
    [K in keyof T]: FirestoreWithFieldValue<T[K]> | FieldValue
}





export declare type PartialWithFieldValue<T> = Partial<WithFieldValue<T>>

type GenNode<K extends string, IsRoot extends boolean> = IsRoot extends true ? `${K}` : `.${K}`

export type FilterableFields<
    T extends object,
    IsRoot extends boolean = true,
    K extends keyof T = keyof T,
> = K extends string
    ? // Handle firebase timestamp fields
      T[K] extends Timestamp
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
          ? Date | Timestamp
          : T[K]
      : K extends string
        ? string | number | boolean
        : never

export type PrimitiveFilterOp = '<' | '<=' | '==' | '!=' | '>=' | '>'

export type FilterBy<T extends object, Field extends string = FilterableFields<T>> = Field extends string
    ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
      GetValue<T, Field> extends any[]
        ? [Field, 'array-contains', string] | [Field, 'array-contains-any', string[]]
        : [Field, PrimitiveFilterOp, GetValue<T, Field>] | [Field, 'in', string[]] | [Field, 'not-in', string[]]
    : never

export type OrderBy<T extends DocumentData, Fields extends string = FilterableFields<T>> = [Fields, OrderByDirection]

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
        options?: TransactionOptions
    ): Promise<T>
}

export interface Firestore {
    app: FirebaseFirestore
    collection: typeof collection
    getDocs: typeof getDocs
    getDoc: typeof getDoc
    serverTimestamp: typeof serverTimestamp
    query: typeof query
    where: typeof where
    limit: typeof limit
    orderBy: typeof orderBy
    setDoc: typeof setDoc
    updateDoc: typeof updateDoc
    deleteDoc: typeof deleteDoc
    doc: typeof doc
    onSnapshot: typeof onSnapshot
    increment: typeof increment
    runTransaction: typeof runTransaction
}
