import { DocumentData, FirestoreTypes, InternalFirestoreDataConverter, WithFieldValue } from './FirestoreTypes'
import { WithoutId } from './Reference'

export class MergeConverters<
    T extends DocumentData,
    SerializedT extends DocumentData,
    G extends DocumentData,
    SerializedG extends DocumentData,
> implements InternalFirestoreDataConverter<T & G, SerializedT & SerializedG>
{
    constructor(
        private converter1: InternalFirestoreDataConverter<T, SerializedT>,
        private converter2: InternalFirestoreDataConverter<G, SerializedG>
    ) {}

    toFirestore(
        modelObject: Partial<WithFieldValue<WithoutId<T>>> & Partial<WithFieldValue<WithoutId<G>>>,
        options?: FirestoreTypes.SetOptions
    ) {
        if (options) {
            return {
                ...this.converter1.toFirestore(modelObject, options),
                ...this.converter2.toFirestore(modelObject, options),
            }
        } else {
            return {
                ...this.converter1.toFirestore(modelObject),
                ...this.converter2.toFirestore(modelObject),
            }
        }
    }

    fromFirestore(
        snapshot: FirestoreTypes.QueryDocumentSnapshot<T & G, SerializedT & SerializedG>,
        options: FirestoreTypes.SnapshotOptions
    ) {
        return {
            ...this.converter1.fromFirestore(snapshot, options),
            ...this.converter2.fromFirestore(snapshot, options),
        }
    }
}
