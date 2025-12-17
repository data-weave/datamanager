import { Firestore, FirestoreApp, FirestoreTypes, Transaction } from '@data-weave/backend-firestore'

export abstract class FieldValues {
    public abstract serverTimestamp(): FirestoreTypes.FieldValue
    public abstract delete(): FirestoreTypes.FieldValue
    public abstract increment(n: number): FirestoreTypes.FieldValue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract arrayUnion(...elements: any[]): FirestoreTypes.FieldValue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract arrayRemove(...elements: any[]): FirestoreTypes.FieldValue
}

/*
 *  FirestoreAdminAdapter creates an interface between modular and namespaced
 *  firestore libraries.
 *   - admin sdk doesn't support modular imports
 */


export class FirestoreAdminAdapter implements Firestore {
    public app: FirestoreApp
    constructor(
        readonly firestore: FirestoreApp,
        readonly fieldValues: FieldValues
    ) {
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
            type: 'limit' as const,
            limit,
        }
    }

    public orderBy(orderBy: string | FirestoreTypes.FieldPath, direction: FirestoreTypes.OrderByDirection |) {
        return {
            type: 'orderBy' as const,
            field: orderBy,
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
