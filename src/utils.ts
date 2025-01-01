import {
    DocumentData,
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    SetOptions,
    SnapshotOptions,
} from '@firebase/firestore-types'

export class mergeConverters<T, G> implements FirestoreDataConverter<T & G> {
    constructor(
        private converter1: FirestoreDataConverter<T>,
        private converter2: FirestoreDataConverter<G>
    ) {}

    toFirestore(modelObject: T & G, options?: SetOptions): DocumentData {
        if (options) {
            return {
                ...this.converter1.toFirestore(modelObject, options),
                ...this.converter2.toFirestore(modelObject, options),
            }
        } else {
            return { ...this.converter1.toFirestore(modelObject), ...this.converter2.toFirestore(modelObject) }
        }
    }

    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T & G {
        return {
            ...this.converter1.fromFirestore(snapshot, options),
            ...this.converter2.fromFirestore(snapshot, options),
        }
    }
}
