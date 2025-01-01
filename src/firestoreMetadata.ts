import { DocumentData, SetOptions, SnapshotOptions, WithFieldValue } from '@firebase/firestore'
import { FirestoreDataConverter, QueryDocumentSnapshot } from './firestoreAppCompatTypes'


export enum FIRESTORE_INTERAL_KEYS {
    DELETE = '__deleted',
    CREATED_AT = '__createdAt',
    UPDATED_AT = '__updatedAt',
}

const

export const FIRESTORE_DELETE_KEY = '__deleted'
export const FIRESTORE_CREATED_AT_KEY = '__createdAt'
export const FIRESTORE_UPDATED_AT_KEY = '__updatedAt'

const FIRESTORE_METADATA_KEYS = [FIRESTORE_DELETE_KEY, FIRESTORE_CREATED_AT_KEY, FIRESTORE_UPDATED_AT_KEY] as const

export interface FirestoreMetadata {
    readonly id: string
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly deleted: boolean
    // TODO: Consider adding versioning ot this
    // firestoreDataManagerVersion: string
}

export class FirestoreMetadataConverter implements FirestoreDataConverter<FirestoreMetadata> {
    toFirestore(data: FirestoreMetadata, _options?: SetOptions): DocumentData {

        const toInsert: Partial<Record<FIRESTORE_INTERAL_KEYS, any>> = {}
        FIRESTORE_METADATA_KEYS.forEach(key => {
            toInsert[key] = data[key]
        })

        return {
            [FIRESTORE_UPDATED_AT_KEY]: data.updatedAt,
            [FIRESTORE_CREATED_AT_KEY]: data.createdAt,
        }
    }
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FirestoreMetadata {
        const data = snapshot.data(options)
        return {
            id: snapshot.id,
            createdAt: data[FIRESTORE_CREATED_AT_KEY].toDate(),
            updatedAt: data[FIRESTORE_UPDATED_AT_KEY].toDate(),
            deleted: data[FIRESTORE_DELETE_KEY],
        }
    }
}
