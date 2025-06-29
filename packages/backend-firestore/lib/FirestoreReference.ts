import { LiveReference, LiveReferenceOptions } from '@js-state-reactivity-models/datamanager'
import { DocumentData, Firestore, FirestoreReadMode, FirestoreTypes } from './firestoreTypes'
import { checkIfReferenceExists } from './utils'

export interface FirestoreReferenceOptions<T> extends LiveReferenceOptions<T> {
    readMode?: FirestoreReadMode
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
            return new Promise<T | undefined>((res, reject) => {
                this.unsubscribeFromSnapshot = this.firestore.onSnapshot(
                    this.docRef,
                    documentSnapshot => {
                        try {
                            this.onUpdate(this.parseDocumentSnapshot(documentSnapshot))
                            res(this.value)
                        } catch (error) {
                            this.onError(error)
                            reject(error)
                        }
                    },
                    error => {
                        this.onError(error)
                        reject(error)
                    }
                )
            })
        }
        try {
            console.log('getDoc', this.docRef.path)
            const doc = await this.firestore.getDoc(this.docRef)
            this.onUpdate(this.parseDocumentSnapshot(doc))
        } catch (error) {
            this.onError(error)
            throw error
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
        console.warn(`FirestoreReference error ${this.docRef.path}`, error)
        super.onError(error)
    }

    public unSubscribe() {
        this.unsubscribeFromSnapshot?.()
        this.setStale()
    }

    private parseDocumentSnapshot(docSnapshot: FirestoreTypes.DocumentSnapshot<T, S>): T | undefined {
        if (!checkIfReferenceExists(docSnapshot)) throw new Error(`Document does not exist ${this.docRef.path}`)
        return docSnapshot.data()
    }
}
