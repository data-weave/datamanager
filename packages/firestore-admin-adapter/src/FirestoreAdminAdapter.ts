import type { AggregateResult, AggregateSpec, Firestore } from '@data-weave/backend-firestore'
import {
    AggregateField,
    type Firestore as AdminFirestore,
    type CollectionReference,
    type DocumentData,
    type DocumentReference,
    type DocumentSnapshot,
    type FieldPath,
    type FieldValue,
    type OrderByDirection,
    type Query,
    type QuerySnapshot,
    type ReadOnlyTransactionOptions,
    type ReadWriteTransactionOptions,
    type SetOptions,
    type Transaction,
    type UpdateData,
    type WhereFilterOp,
} from 'firebase-admin/firestore'

/** Query constraint built by `where`/`orderBy`/`limit` and applied by `query`. */
type Constraint = (query: Query) => Query

/*
 *  FirestoreAdminAdapter creates an interface between modular and namespaced
 *  firestore libraries.
 *   - admin sdk doesn't support modular imports
 */
class AdminAdapter implements Record<keyof Firestore, unknown> {
    constructor(
        readonly app: AdminFirestore,
        readonly fieldValues: typeof FieldValue
    ) {}

    public collection(reference: AdminFirestore | DocumentReference, path: string) {
        return reference.collection(path)
    }

    public getDocs(query: Query) {
        return query.get()
    }

    public async getAggregateFromServer<Spec extends AggregateSpec>(
        query: Query,
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

    public getDoc(reference: DocumentReference) {
        return reference.get()
    }

    public serverTimestamp() {
        return this.fieldValues.serverTimestamp()
    }

    public increment(n: number) {
        return this.fieldValues.increment(n)
    }

    public query(query: Query, ...constraints: Constraint[]) {
        return constraints.reduce((q, constraint) => constraint(q), query)
    }

    public where(field: string | FieldPath, op: WhereFilterOp, value: unknown): Constraint {
        return query => query.where(field, op, value)
    }

    public limit(limit: number): Constraint {
        return query => query.limit(limit)
    }

    public orderBy(field: string | FieldPath, direction?: OrderByDirection): Constraint {
        return query => query.orderBy(field, direction)
    }

    public setDoc(reference: DocumentReference, data: DocumentData, options: SetOptions = {}) {
        return reference.set(data, options)
    }

    public updateDoc(reference: DocumentReference, data: UpdateData<DocumentData>) {
        return reference.update(data)
    }

    public deleteDoc(reference: DocumentReference) {
        return reference.delete()
    }

    public doc(reference: CollectionReference, path?: string) {
        return path ? reference.doc(path) : reference.doc()
    }

    public onSnapshot(
        reference: DocumentReference | Query,
        onNext: (snapshot: DocumentSnapshot | QuerySnapshot) => void,
        onError?: (error: Error) => void
    ) {
        return reference.onSnapshot(onNext, onError)
    }

    public runTransaction<T>(
        firestore: AdminFirestore,
        transaction: (transaction: Transaction) => Promise<T>,
        options?: ReadWriteTransactionOptions | ReadOnlyTransactionOptions
    ) {
        // Reading queries in a transaction and `runTransaction` on the db handle are Admin SDK specific
        return firestore.runTransaction(transaction, options)
    }
}

// `Firestore` is typed with the modular SDK; the refs, queries and snapshots it passes through here are Admin SDK ones.
export const FirestoreAdminAdapter = AdminAdapter as unknown as new (
    app: AdminFirestore,
    fieldValues: typeof FieldValue
) => Firestore
export type FirestoreAdminAdapter = Firestore
