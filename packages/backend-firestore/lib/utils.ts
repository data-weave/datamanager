import { WithoutId } from '@data-weave/datamanager'
import {
    DocumentData,
    FieldValues,
    Firestore,
    FirestoreApp,
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

/*
 *  FirestoreNamespacedConverter creates an interface between modular and namespaced
 *  firestore libraries.
 *   - admin sdk doesn't support modular imports
 */

// TODO: add types
/* eslint-disable @typescript-eslint/no-explicit-any */
export class FirestoreNamespacedConverter extends Firestore {
    public app: FirestoreApp
    constructor(
        readonly firestore: FirestoreApp,
        readonly fieldValues: FieldValues
    ) {
        super()
        this.app = firestore
        this.fieldValues = fieldValues
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
        return this.fieldValues.serverTimestamp()
    }

    public increment(n: number) {
        return this.fieldValues.increment(n)
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

    public where(field: string | FirestoreTypes.FieldPath, op: string, value: unknown): any {
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

    public deleteDoc(reference: any) {
        return reference.delete()
    }

    public doc(reference: any, path?: string) {
        if (!path) return reference.doc()
        return reference.doc(path)
    }

    public onSnapshot(reference: any, onNext: (snapshot: any) => void, onError?: (error: Error) => void) {
        return reference.onSnapshot(onNext, onError)
    }

    public runTransaction<T>(
        firestore: FirestoreApp,
        transaction: (transaction: Transaction) => Promise<T>,
        options?: FirestoreTypes.TransactionOptions
    ) {
        return firestore.runTransaction!(transaction, options)
    }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
