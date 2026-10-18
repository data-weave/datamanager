import { ListPaginationParams, LiveList, LiveListOptions } from '@data-weave/datamanager'
import { FirestoreListError } from './errors'
import { DocumentData, Firestore, FirestoreReadMode, FirestoreTypes } from './firestoreTypes'

export type { FirestoreListContext } from './errors'

export interface FirestoreListOptions<T> extends LiveListOptions<T> {
    readMode?: FirestoreReadMode
    snapshotOptions?: FirestoreTypes.SnapshotOptions
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
            return new Promise<T[]>(resolve => {
                // Unsubscribe from any existing snapshot listener
                if (this.unsubscribeFromSnapshot) {
                    this.unsubscribeFromSnapshot()
                }

                this.unsubscribeFromSnapshot = this.firestore.onSnapshot(
                    this.query,
                    querySnapshot => {
                        try {
                            if (initialLoad) {
                                initialLoad = false
                                this.handleInitialDataChange(querySnapshot.docs)
                            } else {
                                this.handleSubsequentDataChanges(querySnapshot.docChanges())
                            }
                            // TODO: When calling ".resolve()" with realtime listener,
                            // the snapshot data might be stale from cache.
                            resolve(this.values)
                        } catch (error) {
                            this.onError(error)
                            resolve(this.values)
                        }
                    },
                    error => {
                        this.onError(error)
                        resolve(this.values)
                    }
                )
            })
        }
        try {
            const snapshot = await this.firestore.getDocs(this.query)
            this.handleInitialDataChange(snapshot.docs)
        } catch (error) {
            this.onError(error)
        }
        return this.values
    }

    protected handleInitialDataChange(values: FirestoreTypes.QueryDocumentSnapshot<T, S>[]) {
        const newValues = values.map(v => v.data(this.options?.snapshotOptions))
        this.onUpdateAll(newValues)
    }

    protected handleSubsequentDataChanges(changes: FirestoreTypes.DocumentChange<T, S>[]) {
        const values = [...this.values]
        for (const change of changes) {
            if (change.oldIndex !== -1) values.splice(change.oldIndex, 1)
            if (change.newIndex !== -1)
                values.splice(change.newIndex, 0, change.doc.data(this.options?.snapshotOptions))
        }
        this.onUpdateAll(values)
    }

    public unsubscribe() {
        this.unsubscribeFromSnapshot?.()
        this.setStale()
    }

    protected onError(error: unknown) {
        const wrapped = new FirestoreListError(error, {
            query: this.query,
            readMode: this.options?.readMode,
            snapshotOptions: this.options?.snapshotOptions,
            type: 'list',
        })
        super.onError(wrapped)
    }
}
