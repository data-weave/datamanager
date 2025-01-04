import { DocumentReference, FirestoreReadMode } from './firestoreAppCompatTypes'
import { Reference } from './reference'

export interface FirestoreReferenceOptions<T> {
    readMode?: FirestoreReadMode
    onUpdate?: (newValue: T | undefined) => void
}

export class FirestoreReference<T> implements Reference<T> {
    protected _value: T | undefined
    protected _resolved: boolean = false
    private unsubscribeFromSnapshot: undefined | (() => void)

    constructor(
        private readonly doc: DocumentReference<T>,
        private readonly options: FirestoreReferenceOptions<T>
    ) {}

    public get id(): string {
        return this.doc.id
    }

    public get value(): T | undefined {
        return this._value
    }

    public get resolved() {
        return this._resolved
    }

    public async resolve(): Promise<T | undefined> {
        if (this.options?.readMode === 'realtime') {
            this.unsubscribeFromSnapshot = this.doc.onSnapshot(documentSnapshot => {
                const data = documentSnapshot.data()
                this.setValue(data)
                this.options.onUpdate?.(this._value)
            })
        } else {
            const doc = await this.doc.get()
            this.setValue(await doc.data())
        }
        return this._value
    }

    public unSubscribe() {
        this.unsubscribeFromSnapshot?.()
    }

    protected setValue(value: T | undefined) {
        this._value = value
        this._resolved = true
        this.onValueChange()
    }

    protected onValueChange(): void {}
}
