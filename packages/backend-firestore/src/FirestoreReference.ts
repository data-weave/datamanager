import { LiveReference, LiveReferenceOptions } from '@data-weave/datamanager'
import { FirestoreReferenceError } from './errors'
import { DocumentData, Firestore, FirestoreReadMode, FirestoreTypes } from './firestoreTypes'
import { checkIfReferenceExists } from './utils'

export type { FirestoreReferenceContext } from './errors'

export interface FirestoreReferenceOptions<T> extends LiveReferenceOptions<T> {
    readMode?: FirestoreReadMode
    snapshotOptions?: FirestoreTypes.SnapshotOptions
}

export class FirestoreReference<T extends DocumentData, S extends DocumentData> extends LiveReference<T> {
    private unsubscribeFromSnapshot: undefined | (() => void)

    constructor(
        private readonly firestore: Firestore,
        private readonly docRef: FirestoreTypes.DocumentReference<T, S>,
        readonly options: FirestoreReferenceOptions<T>
    ) {
        super(options)
    }

    public async resolve(): Promise<T | undefined> {
        if (this.options?.readMode === 'realtime') {
            return new Promise<T | undefined>(res => {
                // Unsubscribe from any existing snapshot listener
                if (this.unsubscribeFromSnapshot) {
                    this.unsubscribeFromSnapshot()
                }

                this.unsubscribeFromSnapshot = this.firestore.onSnapshot(
                    this.docRef,
                    documentSnapshot => {
                        try {
                            this.onUpdate(this.parseDocumentSnapshot(documentSnapshot))
                            // TODO: When calling ".resolve()" with realtime listener,
                            // the snapshot data might be stale from cache.
                            res(this.value)
                        } catch (error) {
                            this.onError(error)
                            res(this.value)
                        }
                    },
                    error => {
                        this.onError(error)
                        res(this.value)
                    }
                )
            })
        }
        try {
            const doc = await this.firestore.getDoc(this.docRef)
            this.onUpdate(this.parseDocumentSnapshot(doc))
        } catch (error) {
            this.onError(error)
        }
        return this.value
    }

    public get id(): string {
        return this.docRef.id
    }

    public get path(): string {
        return this.docRef.path
    }

    protected onError(error: unknown): void {
        const wrapped = new FirestoreReferenceError(error, {
            path: this.docRef.path,
            id: this.docRef.id,
            readMode: this.options?.readMode,
            snapshotOptions: this.options?.snapshotOptions,
            type: 'reference',
        })
        super.onError(wrapped)
    }

    public unSubscribe() {
        this.unsubscribeFromSnapshot?.()
        this.setStale()
    }

    private parseDocumentSnapshot(docSnapshot: FirestoreTypes.DocumentSnapshot<T, S>): T | undefined {
        if (!checkIfReferenceExists(docSnapshot)) throw new Error(`Document does not exist ${this.docRef.path}`)
        return docSnapshot.data(this.options?.snapshotOptions)
    }
}
