import {
    DocumentChange,
    DocumentData,
    FirestoreDataConverter,
    FirestoreReadMode,
    Query,
    QueryDocumentSnapshot,
} from './FirestoreTypes'
import { List } from './List'

export interface FirestoreListOptions<T> {
    readMode?: FirestoreReadMode
    onUpdate?: (newValues: T[]) => void
}

export class FirestoreList<T> implements List<T> {
    protected _values: T[] = []
    protected _resolved: boolean = false
    private unsubscribeFromSnapshot: undefined | (() => void)

    constructor(
        private readonly query: Query<DocumentData>,
        private readonly options: FirestoreListOptions<T>,
        private readonly converter: FirestoreDataConverter<T>
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
            return new Promise<T[]>((resolve, reject) => {
                this.unsubscribeFromSnapshot = this.query.onSnapshot(querySnapshot => {
                    if (initialLoad) {
                        initialLoad = false
                        this.handleInitialDataChange(querySnapshot.docs)
                    } else {
                        this.handleSubsequentDataChanges(querySnapshot.docChanges())
                    }
                    this.options.onUpdate?.(this._values)
                    resolve(this._values)
                }, reject)
            })
        } else {
            const snapshot = await this.query.get()
            this.handleInitialDataChange(snapshot.docs)
            return this._values
        }
    }

    protected handleInitialDataChange(values: QueryDocumentSnapshot<DocumentData>[]) {
        this._values = []
        this._values = values.map(v => this.converter.fromFirestore(v, {}))
        this._resolved = true
        this.onValuesChange()
    }

    protected handleSubsequentDataChanges(changes: DocumentChange<DocumentData>[]) {
        const newValues = [...this._values]

        changes.forEach(change => {
            if (change.type === 'added') {
                newValues.splice(change.newIndex, 0, this.converter.fromFirestore(change.doc, {}))
            } else if (change.type === 'modified') {
                newValues.splice(change.newIndex, 1, this.converter.fromFirestore(change.doc, {}))
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
}
