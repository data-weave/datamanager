/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    FieldPath,
    FieldValue,
    Firestore,
    FirestoreApp,
    OrderByDirection,
    SetOptions,
    Transaction,
    TransactionOptions,
} from '@data-weave/backend-firestore'

export abstract class FieldValues {
    public abstract serverTimestamp(): FieldValue
    public abstract delete(): FieldValue
    public abstract increment(n: number): FieldValue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract arrayUnion(...elements: any[]): FieldValue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public abstract arrayRemove(...elements: any[]): FieldValue
}

/*
 *  FirestoreAdminAdapter creates an interface between modular and namespaced
 *  firestore libraries.
 *   - admin sdk doesn't support modular imports
 */

export class FirestoreAdminAdapter implements Firestore {
    // TODO:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public app: any
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

    public where(field: string | FieldPath, op: string, value: unknown): any {
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

    public orderBy(orderBy: string | FieldPath, direction: OrderByDirection | undefined) {
        return {
            type: 'orderBy' as const,
            field: orderBy,
            direction,
        }
    }

    public setDoc(reference: any, data: any, options?: SetOptions) {
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

    public onSnapshot(reference: any, onNext: any, onError?: any, onCompletion?: any) {
        return reference.onSnapshot(onNext, onError, onCompletion)
    }

    public runTransaction<T>(
        firestore: any,
        transaction: (transaction: Transaction) => Promise<T>,
        options?: TransactionOptions
    ) {
        return firestore.runTransaction!(transaction, options)
    }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
