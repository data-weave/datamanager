import { injectable } from 'inversify'

import { FirestoreList } from './FirestoreList'

import { MergeConverters } from './utils'
import {
    CollectionReference,
    DocumentData,
    DocumentReference,
    FieldValue,
    FilterBy,
    FirebaseCreateOptions,
    FirebaseReadOptions,
    FirebaseWriteData,
    FirebaseWriteOptions,
    FirebaseFirestore,
    FirestoreDataConverter,
    FirestoreReadMode,
    OrderBy,
    Query,
    WithFieldValue,
} from './FirestoreTypes'
import { WithMetadata, CreateOptions, DataManager, Metadata } from './dataManager'
import { FirestoreMetadataConverter, queryNotDeleted, FIRESTORE_KEYS } from './firestoreMetadata'
import { FirestoreReference } from './firestoreReference'
import { List } from './List'
import { IdentifiableReference } from './reference'

export type FirebaseDataManagerDeleteMode = 'soft' | 'hard'

export interface FirebaseDataManagerOptions {
    readonly idResolver?: () => string
    readonly deleteMode?: FirebaseDataManagerDeleteMode
    readonly readMode?: FirestoreReadMode
    readonly preventOverwriteOnCreate?: boolean
    readonly ReferenceClass?: typeof FirestoreReference
    readonly ListClass?: typeof FirestoreList
}

const defaultFirebaseDataManagerOptions: FirebaseDataManagerOptions = {
    deleteMode: 'soft',
    preventOverwriteOnCreate: false,
    readMode: 'static',
    ReferenceClass: FirestoreReference,
    ListClass: FirestoreList,
}

export interface QueryParams<T> {
    readonly filters?: Array<FilterBy<T>>
    readonly orderBy?: Array<OrderBy<T>>
    readonly limit?: number
}

@injectable()
export class FirestoreDataManager<T extends object> implements DataManager<T> {
    private mergedConverter: MergeConverters<T, Metadata>
    private collection: CollectionReference<DocumentData>
    private collectionQuery: Query<DocumentData>
    private managerOptions: FirebaseDataManagerOptions
    private refMap: Map<string, IdentifiableReference<WithMetadata<T>>> = new Map()
    private listMap: Map<string, List<WithMetadata<T>>> = new Map()

    constructor(
        readonly Firestore: FirebaseFirestore,
        readonly FieldValue: FieldValue,
        readonly collectionPath: string,
        readonly converter: FirestoreDataConverter<T>,
        readonly opts?: FirebaseDataManagerOptions
    ) {
        this.mergedConverter = new MergeConverters(converter, new FirestoreMetadataConverter())
        this.managerOptions = Object.assign(defaultFirebaseDataManagerOptions, opts)
        this.collection = Firestore.collection(collectionPath)
        this.collectionQuery =
            this.managerOptions.deleteMode === 'soft' ? queryNotDeleted(this.collection) : this.collection
    }

    public async read(id: string, options?: FirebaseReadOptions): Promise<WithMetadata<T> | undefined> {
        if (!this.managerOptions?.ReferenceClass) throw new Error('ReferenceClass not defined')

        const ref = this.getRef(id)

        if (options?.transaction) {
            const snapshot = await options.transaction.get(this.collection.doc(id))
            if (!snapshot.exists) return undefined
            return this.mergedConverter.fromFirestore(snapshot as never, {})
        }
        return await ref.resolve()
    }

    public async create(data: FirebaseWriteData<T>, options?: FirebaseCreateOptions) {
        let id: string | undefined = undefined
        if (options?.id) {
            id = options?.id
        } else if (this.managerOptions?.idResolver) {
            id = this.managerOptions.idResolver()
        }

        let docRef = this.collection.doc()
        if (id) {
            docRef = this.collection.doc(id)
            await this.preventOverwriteOnCreate(docRef, options)
        }

        // @ts-expect-error FIXME:
        const extendedData = this.mergedConverter.toFirestore({
            ...data,
            [FIRESTORE_KEYS.CREATED_AT]: this.FieldValue.serverTimestamp(),
            [FIRESTORE_KEYS.UPDATED_AT]: this.FieldValue.serverTimestamp(),
            [FIRESTORE_KEYS.DELETED]: false,
        })
        const firebaseOptions = { merge: options?.merge }

        if (options?.transaction) {
            await options?.transaction.set(docRef, extendedData, firebaseOptions)
        } else {
            await docRef.set(extendedData, firebaseOptions)
        }

        return this.getRef(docRef.id)
    }

    private async _update(
        id: string,
        data: Partial<FirebaseWriteData<T> | Partial<Metadata>>,
        options?: FirebaseWriteOptions
    ) {
        // @ts-expect-error TODO: Allow converters to recieve partial data or just metadata
        const withMetadata = this.mergedConverter.toFirestore({
            ...data,
            [FIRESTORE_KEYS.UPDATED_AT]: this.FieldValue.serverTimestamp(),
        })

        const ref = this.collection.doc(id)

        if (options?.transaction) {
            return options.transaction.update(ref, withMetadata)
        }

        return ref.update(withMetadata)
    }

    public async update(id: string, data: Partial<FirebaseWriteData<T>>, options?: FirebaseWriteOptions) {
        await this._update(id, data, options)
    }

    public async upsert(id: string, data: Partial<FirebaseWriteData<T>>, options?: FirebaseWriteOptions) {
        this.create(data as unknown as WithFieldValue<T>, { ...options, id, merge: true })
    }

    public async delete(id: string, options?: FirebaseWriteOptions) {
        await this._update(id, { [FIRESTORE_KEYS.DELETED]: true }, options)
    }

    public getRef(id: string) {
        if (!this.managerOptions?.ReferenceClass) throw new Error('ReferenceClass not defined')

        // TODO: Consider a proper cache
        if (this.refMap.has(id)) {
            return this.refMap.get(id)!
        }

        const newRef = new this.managerOptions.ReferenceClass<WithMetadata<T>>(
            this.collection.doc(id),
            {
                readMode: this.managerOptions.readMode,
            },
            this.mergedConverter
        )
        this.refMap.set(id, newRef)
        return newRef
    }

    public getList(params?: QueryParams<T>) {
        if (!this.managerOptions.ListClass) throw new Error('ListClass not defined')
        let compoundQuery = this.collectionQuery

        params?.filters?.forEach(filter => {
            compoundQuery = compoundQuery.where(filter[0], filter[1], filter[2])
        })

        params?.orderBy?.forEach(orderBy => {
            compoundQuery = compoundQuery.orderBy(orderBy[0], orderBy[1])
        })

        if (params?.limit) {
            compoundQuery = compoundQuery.limit(params.limit)
        }

        // TODO: Consider a proper cache
        const key = JSON.stringify(params || {})
        if (this.listMap.has(key)) {
            return this.listMap.get(key)!
        }
        const newList = new this.managerOptions.ListClass(
            compoundQuery,
            { readMode: this.managerOptions.readMode },
            this.mergedConverter
        )
        this.listMap.set(key, newList)
        return newList
    }

    private async preventOverwriteOnCreate(docRef: DocumentReference, createOptions?: CreateOptions) {
        if (this.managerOptions.preventOverwriteOnCreate && createOptions?.merge !== true) {
            const doc = await docRef.get()
            if (doc.exists) {
                throw new Error('Document already exists')
            }
        }
    }
}
