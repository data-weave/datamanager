import { DocumentChange, FirestoreReadMode, Query } from './firestoreAppCompatTypes'
import { List } from './List'

export interface FirestoreListOptions<T> {
    readMode?: FirestoreReadMode
    onUpdate?: (newValues: T[]) => void
}

export class FirestoreList<T> implements List<T> {
    protected readonly _values: T[] = []
    protected _resolved: boolean = false
    private unsubscribeFromSnapshot: undefined | (() => void)

    constructor(
        private readonly query: Query<T>,
        private readonly options: FirestoreListOptions<T>
    ) {}

    public get values() {
        return this._values
    }

    public get resolved() {
        return this._resolved
    }

    public async resolve() {
        if (this.options?.readMode === 'realtime') {
            let initialLoad = true
            this.unsubscribeFromSnapshot = this.query.onSnapshot(querySnapshot => {
                if (initialLoad) {
                    initialLoad = false
                    this.handleInitialDataChange(querySnapshot.docs.map(doc => doc.data()))
                } else {
                    this.handleSubsequentDataChanges(querySnapshot.docChanges())
                }
                this.options.onUpdate?.(this._values)
            })
        } else {
            const snapshot = await this.query.get()
            this.handleInitialDataChange(snapshot.docs.map(doc => doc.data()))
        }
        return this._values
    }

    protected handleInitialDataChange(values: T[]) {
        this._values.splice(0, this._values.length, ...values)
        this._resolved = true
        this.onValuesChange()
    }

    protected handleSubsequentDataChanges(changes: DocumentChange<T>[]) {
        changes.forEach(change => {
            if (change.type === 'added') {
                this._values.splice(change.newIndex, 0, change.doc.data())
            } else if (change.type === 'modified') {
                this._values.splice(change.newIndex, 1, change.doc.data())
            } else if (change.type === 'removed') {
                this._values.splice(change.oldIndex, 1)
            }
        })
        this.onValuesChange()
    }

    public unSubscribe() {
        this.unsubscribeFromSnapshot?.()
    }

    protected onValuesChange(): void {}
}
