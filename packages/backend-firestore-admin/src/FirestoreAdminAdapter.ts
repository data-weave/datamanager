import {
    type AggregateResult,
    type AggregateSpec,
    FieldValues,
    Firestore,
    FirestoreApp,
    FirestoreTypes,
    Transaction,
} from '@data-weave/backend-firestore'
import { AggregateField } from 'firebase-admin/firestore'

/*
 *  FirestoreAdminAdapter creates an interface between modular and namespaced
 *  firestore libraries.
 *   - admin sdk doesn't support modular imports
 */

// TODO: add types
/* eslint-disable @typescript-eslint/no-explicit-any */
export class FirestoreAdminAdapter extends Firestore {
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

    public async getAggregateFromServer<Spec extends AggregateSpec>(
        query: any,
        spec: Spec
    ): Promise<AggregateResult<Spec>> {
        const adminSpec = Object.fromEntries(
            Object.keys(spec).map(alias => {
                const fieldSpec = spec[alias]
                if (fieldSpec.type === 'count') {
                    return [alias, AggregateField.count()]
                }
                return [alias, AggregateField[fieldSpec.type](fieldSpec.field)]
            })
        )

        const snapshot = await query.aggregate(adminSpec).get()
        return snapshot.data() as AggregateResult<Spec>
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
