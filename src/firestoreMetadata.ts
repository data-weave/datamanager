import { DocumentData, SetOptions, SnapshotOptions } from '@firebase/firestore'
import { FirestoreDataConverter, Query, QueryDocumentSnapshot } from './firestoreAppCompatTypes'
import { WithMetadata } from 'typescript'

enum FIRESTORE_INTERAL_KEYS {
    DELETED = '__deleted',
    CREATED_AT = '__createdAt',
    UPDATED_AT = '__updatedAt',
}

export enum FIRESTORE_KEYS {
    DELETED = 'deleted',
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt',
}

const Mapping: Record<FIRESTORE_INTERAL_KEYS, FIRESTORE_KEYS> = {
    [FIRESTORE_INTERAL_KEYS.DELETED]: FIRESTORE_KEYS.DELETED,
    [FIRESTORE_INTERAL_KEYS.CREATED_AT]: FIRESTORE_KEYS.CREATED_AT,
    [FIRESTORE_INTERAL_KEYS.UPDATED_AT]: FIRESTORE_KEYS.UPDATED_AT,
}

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
        const toInsert: DocumentData = {}
        Object.values(FIRESTORE_INTERAL_KEYS).forEach(key => {
            toInsert[key] = data[Mapping[key]]
        })

        return toInsert
    }
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FirestoreMetadata {
        const data = snapshot.data(options)
        return {
            id: snapshot.id,
            // TODO: add warning in case data type is not as expected
            createdAt: data[FIRESTORE_INTERAL_KEYS.CREATED_AT].toDate(),
            updatedAt: data[FIRESTORE_INTERAL_KEYS.UPDATED_AT].toDate(),
            deleted: data[FIRESTORE_INTERAL_KEYS.DELETED],
        }
    }
}

export const queryNotDeleted = <T>(query: Query<WithMetadata<T>>) =>
    query.where(FIRESTORE_INTERAL_KEYS.DELETED, '==', false)
