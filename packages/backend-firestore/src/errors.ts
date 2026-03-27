import { FirestoreReadMode, FirestoreTypes } from './firestoreTypes'

export interface FirestoreReferenceContext {
    path: string
    id: string
    readMode?: FirestoreReadMode
    snapshotOptions?: FirestoreTypes.SnapshotOptions
    type: 'reference'
}

export interface FirestoreListContext {
    query: FirestoreTypes.Query<unknown>
    readMode?: FirestoreReadMode
    type: 'list'
}

export class FirestoreError extends Error {
    public readonly cause: unknown

    constructor(message: string, cause?: unknown) {
        super(message)
        this.name = 'FirestoreError'
        this.cause = cause
    }
}

export class FirestoreReferenceError extends FirestoreError {
    constructor(
        cause: unknown,
        public readonly context: FirestoreReferenceContext
    ) {
        super(`FirestoreReference error at "${context.path}"`, cause)
        this.name = 'FirestoreReferenceError'
    }
}

export class FirestoreListError extends FirestoreError {
    constructor(
        cause: unknown,
        public readonly context: FirestoreListContext
    ) {
        super('FirestoreList error', cause)
        this.name = 'FirestoreListError'
    }
}
