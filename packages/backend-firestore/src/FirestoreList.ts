import { ListPaginationParams, LiveList, LiveListOptions } from '@data-weave/datamanager'
import { DocumentData, Firestore, FirestoreReadMode, FirestoreTypes } from './firestoreTypes'

export interface FirestoreListContext {
    query: FirestoreTypes.Query<unknown>
    readMode?: FirestoreReadMode
    type: 'list'
}

export interface FirestoreListOptions<T> extends LiveListOptions<T> {
    readMode?: FirestoreReadMode
    errorInterceptor?: (error: unknown, ctx: FirestoreListContext) => void
}

export class FirestoreList<T extends DocumentData, S extends DocumentData> extends LiveList<T> {
    private unsubscribeFromSnapshot: undefined | (() => void)

    constructor(
        private readonly firestore: Firestore,
        private readonly query: FirestoreTypes.Query<T, S>,
        private readonly options: FirestoreListOptions<T> & ListPaginationParams
    ) {
        super(options)
    }

    public async resolve() {
        if (this.options?.readMode === 'realtime') {
            let initialLoad = true
            return new Promise<T[]>((resolve, reject) => {
                this.unsubscribeFromSnapshot = this.firestore.onSnapshot(
                    this.query,
                    querySnapshot => {
                        try {
                            if (initialLoad) {
                                initialLoad = false
                                this.handleInitialDataChange(querySnapshot.docs)
                            } else {
                                // handle every change as inital dataload
                                this.handleInitialDataChange(querySnapshot.docs)
                                // this.handleSubsequentDataChanges(querySnapshot.docChanges())
                            }
                            // TODO: When calling ".resolve()" with realtime listener,
                            // the snapshot data might be stale from cache.
                            resolve(this.values)
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
        } else {
            const snapshot = await this.firestore.getDocs(this.query)
            this.handleInitialDataChange(snapshot.docs)
            return this.values
        }
    }

    protected handleInitialDataChange(values: FirestoreTypes.QueryDocumentSnapshot<T, S>[]) {
        const newValues = values.map(v => v.data())
        this.onUpdateAll(newValues)
    }

    protected handleSubsequentDataChanges(changes: FirestoreTypes.DocumentChange<T, S>[]) {
        changes.forEach(change => {
            if (change.type === 'added') {
                this.onAddAtIndex(change.newIndex, change.doc.data())
            } else if (change.type === 'modified') {
                this.onUpdateAtIndex(change.newIndex, change.doc.data())
            } else if (change.type === 'removed') {
                this.onRemoveAtIndex(change.oldIndex)
            }
        })

        // TODO: handle onUpdate in the parent class - make sure it's only called once after all changes are processed
        this.onUpdate()
    }

    public unSubscribe() {
        this.unsubscribeFromSnapshot?.()
        this.setStale()
    }

    protected onError(error: unknown) {
        // Try to provide useful collection details using internal properties
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error(`FirestoreList Collection: ${(this.query as any)?._collectionPath?.id} error`, error)
        this.options?.errorInterceptor?.(error, {
            query: this.query,
            readMode: this.options?.readMode,
            type: 'list',
        })
        super.onError(error)
    }
}
