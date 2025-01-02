import { transaction } from 'mobx'
import { DocumentReference } from './firestoreAppCompatTypes'
import { Reference } from './reference'

export type FirestoreReferenceReadMode = 'realtime' | 'static'

export interface FirestoreReferenceOptions {
    mode?: FirestoreReferenceReadMode
    onUpdate?: () => void
}

export class FirestoreReference<T> implements Reference<T> {
    public _value: T | undefined
    public _resolved: boolean = false
    private unsubscribeFromSnapshot: undefined | (() => void)

    constructor(
        private readonly doc: DocumentReference<T>,
        private readonly options: FirestoreReferenceOptions
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
        if (this.options?.mode === 'realtime') {
            this.unsubscribeFromSnapshot = this.doc.onSnapshot(documentSnapshot => {
                const data = documentSnapshot.data()
                this.setValue(data)
                this.options.onUpdate?.()
            })
        } else {
            const doc = await this.doc.get()
            this.setValue(await doc.data())
        }
        return this.value
    }

    public unSubscribe() {
        this.unsubscribeFromSnapshot?.()
    }

    protected setValue(value: T | undefined) {
        transaction(() => {
            this._value = value
            this._resolved = true
        })
    }
}
