import {
    ConverterToFirestore,
    DocumentData,
    FieldValue,
    Firestore,
    FirestoreDataConverter,
    FirestoreQuery,
    FirestoreWhere,
    Query,
    QueryDocumentSnapshot,
    SetOptions,
    SnapshotOptions,
    Transaction,
    TransactionOptions,
    WithTimestamps,
} from './firestoreTypes'

import { UpdateData } from '@data-weave/datamanager'
import {
    Firestore as FirebaseFirestore,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore'
import { FIRESTORE_INTERAL_KEYS } from './FirestoreMetadata'

export class MergeConverters<
    T extends DocumentData,
    SerializedT extends DocumentData,
    G extends DocumentData,
    SerializedG extends DocumentData,
> implements FirestoreDataConverter<T & G, SerializedT & SerializedG>
{
    constructor(
        private converter1: FirestoreDataConverter<T, SerializedT>,
        private converter2: FirestoreDataConverter<G, SerializedG>
    ) {}

    toFirestore(modelObject: UpdateData<T & G>, options?: SetOptions) {
        return {
            ...this.converter1.toFirestore(modelObject as UpdateData<T>, options),
            ...this.converter2.toFirestore(modelObject as UpdateData<G>, options),
        } as ConverterToFirestore<SerializedT & SerializedG>
    }
    fromFirestore(
        snapshot: QueryDocumentSnapshot<WithTimestamps<SerializedT & SerializedG>>,
        options?: SnapshotOptions
    ) {
        return {
            ...this.converter1.fromFirestore(snapshot, options),
            ...this.converter2.fromFirestore(snapshot, options),
        }
    }
}

export function createModularFirestoreAdapter(firestore: FirebaseFirestore): Firestore {
    return {
        app: firestore,
        collection,
        getDocs,
        getDoc,
        serverTimestamp,
        query,
        where,
        limit,
        orderBy,
        setDoc,
        updateDoc,
        deleteDoc,
        doc,
        onSnapshot,
        increment,
        runTransaction,
    }
}

// Value can be anything
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isFieldValue = (value: any): value is FieldValue => {
    return value !== undefined && typeof value._toFieldTransform === 'function'
}

// Modular firestore uses exists, namespaced uses exists()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkIfReferenceExists = (value: any): boolean => {
    if (value == null) return false
    if (typeof value.exists === 'function') return value.exists()
    return value.exists
}

export const withTransaction = (
    firestore: Firestore,
    transaction: (transaction: Transaction) => Promise<unknown>,
    options?: TransactionOptions
) => {
    return firestore.runTransaction!(firestore.app, transaction, options)
}

export const queryNotDeleted = <T extends DocumentData, SerializedT extends DocumentData>(
    query: Query<T, SerializedT>,
    firestoreQuery: FirestoreQuery<T, SerializedT>,
    firestoreWhere: FirestoreWhere
) => firestoreQuery(query, firestoreWhere(FIRESTORE_INTERAL_KEYS.DELETED, '==', false))
