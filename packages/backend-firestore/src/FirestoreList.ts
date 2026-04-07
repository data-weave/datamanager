import { ListPaginationParams, LiveList, LiveListOptions } from '@data-weave/datamanager'
import { FirestoreListError } from './errors'
import { DocumentData, Firestore, FirestoreReadMode, FirestoreTypes } from './firestoreTypes'

export type { FirestoreListContext } from './errors'

export interface FirestoreListOptions<T> extends LiveListOptions<T> {
    readMode?: FirestoreReadMode
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
                                // handle every change as inital dataload
                                this.handleInitialDataChange(querySnapshot.docs)
                                // this.handleSubsequentDataChanges(querySnapshot.docChanges())
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
        } else {
            try {
                const snapshot = await this.firestore.getDocs(this.query)
                this.handleInitialDataChange(snapshot.docs)
                return this.values
            } catch (error) {
                this.onError(error)
            }
        }
        return this.values
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

    public unsubscribe() {
        this.unsubscribeFromSnapshot?.()
        this.setStale()
    }

    protected onError(error: unknown) {
        const wrapped = new FirestoreListError(error, {
            query: this.query,
            readMode: this.options?.readMode,
            type: 'list',
        })
        super.onError(wrapped)
    }
}
