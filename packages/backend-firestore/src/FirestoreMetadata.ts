import { Metadata } from '@data-weave/datamanager'
import { DocumentData, Firestore, FirestoreTypes, InternalFirestoreDataConverter } from './firestoreTypes'

enum FIRESTORE_INTERNAL_KEYS {
    DELETED = '__deleted',
    CREATED_AT = '__createdAt',
    UPDATED_AT = '__updatedAt',
}

export enum FIRESTORE_KEYS {
    DELETED = 'deleted',
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt',
}

export type FirestoreSerializedMetadata = {
    [FIRESTORE_INTERNAL_KEYS.DELETED]: boolean
    [FIRESTORE_INTERNAL_KEYS.CREATED_AT]: FirestoreTypes.Timestamp
    [FIRESTORE_INTERNAL_KEYS.UPDATED_AT]: FirestoreTypes.Timestamp
}

/** What the data manager writes: the timestamps are always `serverTimestamp()`, never a `Date`. */
export type FirestoreMetadataWrite = {
    [FIRESTORE_KEYS.DELETED]?: boolean
    [FIRESTORE_KEYS.CREATED_AT]?: FirestoreTypes.FieldValue
    [FIRESTORE_KEYS.UPDATED_AT]?: FirestoreTypes.FieldValue
}

export class FirestoreMetadataConverter implements InternalFirestoreDataConverter<
    Metadata,
    FirestoreSerializedMetadata
> {
    toFirestore(data: FirestoreMetadataWrite) {
        return {
            [FIRESTORE_INTERNAL_KEYS.DELETED]: data[FIRESTORE_KEYS.DELETED],
            [FIRESTORE_INTERNAL_KEYS.CREATED_AT]: data[FIRESTORE_KEYS.CREATED_AT],
            [FIRESTORE_INTERNAL_KEYS.UPDATED_AT]: data[FIRESTORE_KEYS.UPDATED_AT],
        }
    }
    fromFirestore(
        snapshot: FirestoreTypes.QueryDocumentSnapshot<DocumentData, DocumentData>,
        options: FirestoreTypes.SnapshotOptions
    ) {
        const data = snapshot.data(options) as FirestoreSerializedMetadata
        return {
            id: snapshot.ref.id,
            // TODO: add warning in case data type is not as expected
            createdAt: data[FIRESTORE_INTERNAL_KEYS.CREATED_AT]?.toDate() ?? new Date(),
            updatedAt: data[FIRESTORE_INTERNAL_KEYS.UPDATED_AT]?.toDate() ?? new Date(),
            deleted: data[FIRESTORE_INTERNAL_KEYS.DELETED],
        }
    }
}

export const queryNotDeleted = <T extends DocumentData, SerializedT extends DocumentData>(
    firestore: Firestore,
    query: FirestoreTypes.Query<T, SerializedT>
) => firestore.query(query, firestore.where(FIRESTORE_INTERNAL_KEYS.DELETED, '==', false))
