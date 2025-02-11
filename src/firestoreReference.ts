import {
    DocumentData,
    DocumentReference,
    DocumentSnapshot,
    FirestoreDataConverter,
    FirestoreReadMode,
} from './FirestoreTypes'
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
        private readonly doc: DocumentReference<DocumentData>,
        private readonly options: FirestoreReferenceOptions<T>,
        private readonly converter: FirestoreDataConverter<T>
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
            return new Promise<T | undefined>((resolve, reject) => {
                this.unsubscribeFromSnapshot = this.doc.onSnapshot(documentSnapshot => {
                    this.setValue(documentSnapshot)
                    this.options.onUpdate?.(this._value)
                    resolve(this._value)
                }, reject)
            })
        } else {
            const doc = await this.doc.get()
            this.setValue(doc)
        }
        return this._value
    }

    public unSubscribe() {
        this.unsubscribeFromSnapshot?.()
    }

    protected setValue(value: DocumentSnapshot<DocumentData>) {
        if (value.exists) {
            try {
                // @ts-expect-error DocumentSnapshot has DocumentData
                // optional if doesn't exist, see "value.exists" check
                this._value = this.converter.fromFirestore(value)
            } catch (error) {
                console.warn('Error desirializing value', error, value)
                this._value = undefined
            }
        } else {
            this._value = undefined
        }
        this._resolved = true
        this.onValueChange()
    }

    protected onValueChange(): void {}
}
