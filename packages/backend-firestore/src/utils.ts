import { WithoutId } from '@data-weave/datamanager'
import {
    AggregateResult,
    AggregateSpec,
    DocumentData,
    Firestore,
    FirestoreTypes,
    InternalFirestoreDataConverter,
    WithFieldValue,
} from './firestoreTypes'

import {
    collection,
    deleteDoc,
    doc,
    Firestore as FirebaseFirestore,
    getAggregateFromServer as firebaseGetAggregateFromServer,
    average as firestoreAverage,
    count as firestoreCount,
    sum as firestoreSum,
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

class ConverterError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ConverterError'
    }
}

export class MergeConverters<
    T extends DocumentData,
    SerializedT extends DocumentData,
    G extends DocumentData,
    SerializedG extends DocumentData,
> implements InternalFirestoreDataConverter<T & G, SerializedT & SerializedG> {
    constructor(
        private converter1: InternalFirestoreDataConverter<T, SerializedT>,
        private converter2: InternalFirestoreDataConverter<G, SerializedG>
    ) {}

    toFirestore(
        modelObject: WithoutId<Partial<WithFieldValue<T>>> & WithoutId<Partial<WithFieldValue<G>>>,
        options?: FirestoreTypes.SetOptions
    ) {
        try {
            if (options) {
                return {
                    ...this.converter1.toFirestore(modelObject, options),
                    ...this.converter2.toFirestore(modelObject, options),
                }
            } else {
                return {
                    ...this.converter1.toFirestore(modelObject),
                    ...this.converter2.toFirestore(modelObject),
                }
            }
        } catch (error) {
            throw new ConverterError(`Failed to convert model object to firestore: ${error}`)
        }
    }

    fromFirestore(
        snapshot: FirestoreTypes.QueryDocumentSnapshot<T & G, SerializedT & SerializedG>,
        options: FirestoreTypes.SnapshotOptions
    ) {
        try {
            return {
                ...this.converter1.fromFirestore(snapshot, options),
                ...this.converter2.fromFirestore(snapshot, options),
            }
        } catch (error) {
            throw new ConverterError(`Failed to convert snapshot to model object: ${error}`)
        }
    }
}

function buildAggregateSpec(spec: AggregateSpec) {
    return Object.fromEntries(
        Object.keys(spec).map(alias => {
            const fieldSpec = spec[alias]
            if (fieldSpec.type === 'count') {
                return [alias, firestoreCount()]
            }
            const factory = fieldSpec.type === 'sum' ? firestoreSum : firestoreAverage
            return [alias, factory(fieldSpec.field)]
        })
    )
}

async function modularGetAggregateFromServer<Spec extends AggregateSpec>(
    ref: FirestoreTypes.Query,
    spec: Spec
): Promise<AggregateResult<Spec>> {
    const sdkSpec = buildAggregateSpec(spec)
    const snapshot = await firebaseGetAggregateFromServer(ref, sdkSpec)
    return snapshot.data() as AggregateResult<Spec>
}

export function createModularFirestoreAdapter(firestore: FirebaseFirestore): Firestore {
    return {
        app: firestore,
        collection,
        getDocs,
        getAggregateFromServer: modularGetAggregateFromServer,
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
export const isFieldValue = (value: any): value is FirestoreTypes.FieldValue => {
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
    transaction: (transaction: FirestoreTypes.Transaction) => Promise<void>,
    options?: FirestoreTypes.TransactionOptions
) => {
    return firestore.runTransaction(firestore.app, transaction, options)
}
