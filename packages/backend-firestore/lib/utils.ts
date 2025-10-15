import { WithoutId } from '@data-weave/datamanager'
import {
    DocumentData,
    Firestore,
    FirestoreTypes,
    InternalFirestoreDataConverter,
    Transaction,
    WithFieldValue,
} from './firestoreTypes'

export class MergeConverters<
    T extends DocumentData,
    SerializedT extends DocumentData,
    G extends DocumentData,
    SerializedG extends DocumentData,
> implements InternalFirestoreDataConverter<T & G, SerializedT & SerializedG>
{
    constructor(
        private converter1: InternalFirestoreDataConverter<T, SerializedT>,
        private converter2: InternalFirestoreDataConverter<G, SerializedG>
    ) {}

    toFirestore(
        modelObject: WithoutId<Partial<WithFieldValue<T>>> & WithoutId<Partial<WithFieldValue<G>>>,
        options?: FirestoreTypes.SetOptions
    ) {
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
    }

    fromFirestore(
        snapshot: FirestoreTypes.QueryDocumentSnapshot<T & G, SerializedT & SerializedG>,
        options: FirestoreTypes.SnapshotOptions
    ) {
        return {
            ...this.converter1.fromFirestore(snapshot, options),
            ...this.converter2.fromFirestore(snapshot, options),
        }
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
    transaction: (transaction: Transaction) => Promise<void>,
    options?: FirestoreTypes.TransactionOptions
) => {
    return firestore.runTransaction!(firestore.app, transaction, options)
}
