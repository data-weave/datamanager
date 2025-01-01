import { DocumentReference } from './firestoreAppCompatTypes'
import { Reference } from './reference'

export interface FirestoreReferenceOptions {
    mode?: 'realtime' | 'static'
    onUpdate?: () => void
}

export class FirestoreReference<T> implements Reference<T> {
    public value: T | undefined
    public resolved: boolean = false
    private unsubscribeFromSnapshot: undefined | (() => void)

    constructor(
        private readonly doc: DocumentReference<T>,
        private readonly options: FirestoreReferenceOptions
    ) {}

    public get id(): string {
        return this.doc.id
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
            return this.value
        }
    }

    public unSubscribe() {
        this.unsubscribeFromSnapshot?.()
    }

    protected setValue(value: T | undefined) {
        this.value = value
        this.resolved = true
    }
}
