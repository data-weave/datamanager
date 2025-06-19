import { List, ListPaginationParams } from '@js-state-reactivity-models/datamanager'
import { DocumentData, Firestore, FirestoreReadMode, FirestoreTypes } from './firestoreTypes'

export interface FirestoreListOptions<T> {
    readMode?: FirestoreReadMode
    onUpdate?: (newValues: T[]) => void
}

export class FirestoreList<T extends DocumentData, S extends DocumentData> implements List<T> {
    protected _values: T[] = []
    protected _resolved: boolean = false
    protected _hasError: boolean = false
    private unsubscribeFromSnapshot: undefined | (() => void)

    constructor(
        private readonly firestore: Firestore,
        private readonly query: FirestoreTypes.Query<T, S>,
        private readonly options: FirestoreListOptions<T> & ListPaginationParams
    ) {}

    public get values() {
        return this._values
    }

    public get hasError() {
        return this._hasError
    }

    public get resolved() {
        return this._resolved
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
                            this.updateError(error)
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
        this._values = []
        this._values = values.map(v => v.data())
        this._resolved = true
        this.onValuesChange()
    }

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
        this._values = newValues
        this.onValuesChange()
    }

    public unSubscribe() {
        this.unsubscribeFromSnapshot?.()
    }

    protected onValuesChange(): void {}

    private updateError(error: unknown) {
        // Try to provide useful collection details using internal properties
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.error(`FirestoreList Collection: ${(this.query as any)?._collectionPath?.id} error`, error)
        this._hasError = true
        this._values = []
        this._resolved = true
        this.onValuesChange()
    }
}
