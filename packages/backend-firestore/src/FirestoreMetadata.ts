import { Metadata, UpdateData } from '@data-weave/datamanager'
import {
    ConverterToFirestore,
    DocumentData,
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    SetOptions,
    SnapshotOptions,
    Timestamp,
    WithTimestamps,
} from './firestoreTypes'

export enum FIRESTORE_INTERAL_KEYS {
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
    [FIRESTORE_INTERAL_KEYS.CREATED_AT]: Date
    [FIRESTORE_INTERAL_KEYS.UPDATED_AT]: Date
}

export class MetadataConverter implements FirestoreDataConverter<Metadata, FirestoreSerializedMetadata> {
    toFirestore(data: UpdateData<Metadata>) {
        return {
            [FIRESTORE_INTERAL_KEYS.DELETED]: data[FIRESTORE_KEYS.DELETED],
            [FIRESTORE_INTERAL_KEYS.CREATED_AT]: data[FIRESTORE_KEYS.CREATED_AT],
            [FIRESTORE_INTERAL_KEYS.UPDATED_AT]: data[FIRESTORE_KEYS.UPDATED_AT],
        }
    }
    fromFirestore(
        snapshot: QueryDocumentSnapshot<WithTimestamps<FirestoreSerializedMetadata>>,
        options: SnapshotOptions
    ) {
        const data = snapshot.data(options)
        return {
            id: snapshot.ref.id,
            createdAt: parseTimestamp(data[FIRESTORE_INTERAL_KEYS.CREATED_AT]),
            updatedAt: parseTimestamp(data[FIRESTORE_INTERAL_KEYS.UPDATED_AT]),
            deleted: data[FIRESTORE_INTERAL_KEYS.DELETED],
        }
    }
}

export class DefaultConverter<T extends DocumentData, SerializedT extends DocumentData = T>
    implements FirestoreDataConverter<T, SerializedT>
{
    toFirestore(modelObject: UpdateData<T>, _options?: SetOptions) {
        return deepSerialize<T, SerializedT>(modelObject)
    }
    fromFirestore(snapshot: QueryDocumentSnapshot<WithTimestamps<SerializedT>>, options?: SnapshotOptions) {
        const data = snapshot.data(options)
        return deepDeserialize<T, SerializedT>(data)
    }
}

const deepSerialize = <T, SerializedT>(data: UpdateData<T>, parentKey?: string): ConverterToFirestore<SerializedT> => {
    const result: Record<string, unknown> = {}
    const keys = Object.keys(data)

    keys.forEach(key => {
        const value = data[key as keyof T]
        const fullPath = parentKey + key
        // arrays
        if (Array.isArray(value)) {
            result[fullPath] = value.map(item => deepSerialize(item))
        }
        // objects
        else if (typeof value === 'object' && value !== null) {
            result[fullPath] = deepSerialize(value, `${fullPath}.`)
        }
        // primitive values
        else if (value !== undefined) {
            result[fullPath] = value
        }
    })
    return result as ConverterToFirestore<SerializedT>
}

const deepDeserialize = <T, SerializedT>(data: WithTimestamps<SerializedT>): T => {
    // TODO:
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data as any
}

const parseTimestamp = (timestamp: Timestamp | undefined) => {
    if (!timestamp) throw new Error('Provided timestamp is undefined')
    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate()
    }
    throw new Error('Provided timestamp is not a valid Timestamp')
}
