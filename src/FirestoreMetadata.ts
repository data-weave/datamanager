import { Metadata } from './DataManager'
import {
    DocumentData,
    FirestoreQuery,
    FirestoreTypes,
    FirestoreWhere,
    InternalFirestoreDataConverter,
    WithFieldValue,
} from './firestoreTypes'
import { WithoutId } from './Reference'

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

export type FirestoreSerializedMetadata = {
    [FIRESTORE_INTERAL_KEYS.DELETED]: boolean
    [FIRESTORE_INTERAL_KEYS.CREATED_AT]: FirestoreTypes.Timestamp
    [FIRESTORE_INTERAL_KEYS.UPDATED_AT]: FirestoreTypes.Timestamp
}

export class FirestoreMetadataConverter
    implements InternalFirestoreDataConverter<Metadata, FirestoreSerializedMetadata>
{
    toFirestore(data: WithFieldValue<WithoutId<Metadata>>) {
        return {
            [FIRESTORE_INTERAL_KEYS.DELETED]: data[FIRESTORE_KEYS.DELETED],
            // Cast: Firestore handles conversion from Date to Timestamp internally
            [FIRESTORE_INTERAL_KEYS.CREATED_AT]: data[FIRESTORE_KEYS.CREATED_AT] as unknown as FirestoreTypes.Timestamp,
            [FIRESTORE_INTERAL_KEYS.UPDATED_AT]: data[FIRESTORE_KEYS.UPDATED_AT] as unknown as FirestoreTypes.Timestamp,
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
            createdAt: data[FIRESTORE_INTERAL_KEYS.CREATED_AT]?.toDate(),
            updatedAt: data[FIRESTORE_INTERAL_KEYS.UPDATED_AT]?.toDate(),
            deleted: data[FIRESTORE_INTERAL_KEYS.DELETED],
        }
    }
}

export const queryNotDeleted = <T extends DocumentData, SerializedT extends DocumentData>(
    query: FirestoreTypes.Query<T, SerializedT>,
    firestoreQuery: FirestoreQuery,
    firestoreWhere: FirestoreWhere
) => firestoreQuery(query, firestoreWhere(FIRESTORE_INTERAL_KEYS.DELETED, '==', false))
