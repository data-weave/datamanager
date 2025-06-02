import { DocumentData, Firestore, FirestoreReadMode, FirestoreTypes } from './FirestoreTypes'
import { Reference } from './Reference'

export interface FirestoreReferenceOptions<T> {
    readMode?: FirestoreReadMode
    onUpdate?: (newValue: T | undefined) => void
}

export class FirestoreReference<T extends DocumentData, S extends DocumentData> implements Reference<T> {
    protected _value: T | undefined
    protected _resolved: boolean = false
    protected _hasError: boolean = false
    private unsubscribeFromSnapshot: undefined | (() => void)

    constructor(
        private readonly firestore: Firestore,
        private readonly docRef: FirestoreTypes.DocumentReference<T, S>,
        private readonly options: FirestoreReferenceOptions<T>
    ) {}

    public get id(): string {
        return this.docRef.id
    }

    public get value(): T | undefined {
        return this._value
    }

    public get resolved() {
        return this._resolved
    }

    public get hasError() {
        return this._hasError
    }

    public async resolve(): Promise<T | undefined> {
        if (this.options?.readMode === 'realtime') {
            return new Promise<T | undefined>((resolve, reject) => {
                this.unsubscribeFromSnapshot = this.firestore.onSnapshot(
                    this.docRef,
                    documentSnapshot => {
                        try {
                            this.updateValue(documentSnapshot)
                            this.options.onUpdate?.(this._value)
                            resolve(this._value)
                        } catch (error) {
                            this.updateError(error)
                            reject(error)
                        }
                    },
                    error => {
                        this.updateError(error)
                        reject(error)
                    }
                )
            })
        }
        try {
            const doc = await this.firestore.getDoc(this.docRef)
            this.updateValue(doc)
        } catch (error) {
            this.updateError(error)
            throw error
        }
        return this._value
    }

    public unSubscribe() {
        this.unsubscribeFromSnapshot?.()
    }

    protected updateValue(docSnapshot: FirestoreTypes.DocumentSnapshot<T, S>) {
        if (!docSnapshot.exists()) throw new Error(`Document does not exist ${this.docRef.path}`)
        this._value = docSnapshot.data()
        this._resolved = true
        this.onValueChange()
    }

    protected onValueChange(): void {}

    private updateError(error: unknown) {
        console.error(`FirestoreReference error ${this.docRef.path}`, error)
        this._hasError = true
        this._value = undefined
        this._resolved = true
        this.onValueChange()
    }
}
