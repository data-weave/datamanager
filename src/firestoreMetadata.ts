import { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot, SetOptions, SnapshotOptions } from "@firebase/firestore-types"

export const FIRESTORE_DELETE_KEY = "__deleted"
export const FIRESTORE_CREATED_AT_KEY = "__createdAt"
export const FIRESTORE_UPDATED_AT_KEY = "__updatedAt"

export interface FirestoreMetadata {
    id: string
    createdAt: Date
    updatedAt: Date
    deleted: boolean
    // TODO: Consider adding versioning ot this
    // firestoreDataManagerVersion: string
}

export class FirestoreMetadataConverter implements FirestoreDataConverter<FirestoreMetadata> {
    toFirestore(data: FirestoreMetadata, options?: SetOptions): DocumentData {
        return {
            [FIRESTORE_UPDATED_AT_KEY]: data.updatedAt,
            [FIRESTORE_CREATED_AT_KEY]: data.createdAt, 
            [FIRESTORE_DELETE_KEY]: data.deleted,
        }
    }
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FirestoreMetadata {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            createdAt: data[FIRESTORE_CREATED_AT_KEY].toDate(),
            updatedAt: data[FIRESTORE_UPDATED_AT_KEY].toDate(),
            deleted: data[FIRESTORE_DELETE_KEY]
        }
    }
}