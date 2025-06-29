import { ListPaginationParams, LiveList, LiveListOptions } from '@js-state-reactivity-models/datamanager'
import { DocumentData, Firestore, FirestoreReadMode, FirestoreTypes } from './firestoreTypes'

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
            return new Promise<T[]>((resolve, reject) => {
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
                            this.options.onUpdate?.(this._values)
                            resolve(this._values)
                        } catch (error) {
                            this.onError(error)
                            reject(error)
                        }
                    },
                    error => {
                        this._hasError = true
                        this.onValuesChange()
                        reject(error)
                    }
                )
            })
        } else {
            const snapshot = await this.firestore.getDocs(this.query)
            this.handleInitialDataChange(snapshot.docs)
            return this._values
        }
    }

    protected handleInitialDataChange(values: FirestoreTypes.QueryDocumentSnapshot<T, S>[]) {
        const newValues = values.map(v => v.data())
        this.onUpdateAll(newValues)
    }

    // TODO: this need a performance optimization and a pass on different clients (web, mobile and different firebase versions
    protected handleSubsequentDataChanges(changes: FirestoreTypes.DocumentChange<T, S>[]) {
        const newValues = [...this._values]
        changes.forEach(change => {
            if (change.type === 'added') {
                newValues.splice(change.newIndex, 0, change.doc.data())
            } else if (change.type === 'modified') {
                newValues.splice(change.newIndex, 1, change.doc.data())
            } else if (change.type === 'removed') {
                newValues.splice(change.oldIndex, 1)
            }
        })
        this.onUpdateAll(newValues)
    }

    public unSubscribe() {
        this.unsubscribeFromSnapshot?.()
    }

    protected onValuesChange(): void {}

    protected onError(error: unknown) {
        // Try to provide useful collection details using internal properties
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error(`FirestoreList Collection: ${(this.query as any)?._collectionPath?.id} error`, error)
        super.onError(error)
    }
}
