import {
    Cache,
    CreateOptions,
    DataManager,
    IdentifiableReference,
    List,
    ListPaginationParams,
    MapCache,
    Metadata,
    NumericKeys,
    WithMetadata,
    WithoutId,
} from '@data-weave/datamanager'
import { FirestoreDataManagerError } from './errors'
import { FirestoreList } from './FirestoreList'
import {
    FIRESTORE_KEYS,
    FirestoreMetadataConverter,
    FirestoreSerializedMetadata,
    queryNotDeleted,
} from './FirestoreMetadata'
import { FirestoreReference, FirestoreReferenceOptions } from './FirestoreReference'
import {
    DocumentData,
    FilterBy,
    FirebaseCreateOptions,
    Firestore,
    FirestoreDataConverter,
    FirestoreReadMode,
    FirestoreReadOptions,
    FirestoreTypes,
    FirestoreWriteOptions,
    InternalFirestoreDataConverter,
    OrderBy,
    WithFieldValue,
} from './firestoreTypes'
import { MergeConverters, checkIfReferenceExists } from './utils'

export type FirebaseDataManagerDeleteMode = 'soft' | 'hard'

export interface FirebaseDataManagerOptions {
    readonly idResolver?: () => string
    readonly deleteMode: FirebaseDataManagerDeleteMode
    readonly readMode: FirestoreReadMode
    readonly preventOverwriteOnCreate: boolean
    readonly snapshotOptions?: FirestoreTypes.SnapshotOptions
    // TODO: Add preventUpdateIfNotExists?
    readonly Reference: typeof FirestoreReference
    readonly List: typeof FirestoreList
    readonly listCache?: Cache
    readonly refCache?: Cache
    readonly disableCache?: boolean
}

const defaultFirebaseDataManagerOptions: FirebaseDataManagerOptions = {
    deleteMode: 'soft',
    preventOverwriteOnCreate: true,
    readMode: 'static',
    Reference: FirestoreReference,
    List: FirestoreList,
}

export interface QueryParams<T> {
    readonly filters?: Array<FilterBy<T & FirestoreSerializedMetadata>>
    readonly orderBy?: Array<OrderBy<T & FirestoreSerializedMetadata>>
}

export class FirestoreDataManager<
    T extends FirestoreTypes.DocumentData,
    SerializedT extends FirestoreTypes.DocumentData = T,
> implements DataManager<T> {
    private mergedConverter: InternalFirestoreDataConverter<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private collection: FirestoreTypes.CollectionReference<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private collectionQuery: FirestoreTypes.Query<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private managerOptions: FirebaseDataManagerOptions

    private refCache: Cache<string, IdentifiableReference<WithMetadata<T>>>
    private listCache: Cache<string, List<WithMetadata<T>>>

    private referenceOptions: FirestoreReferenceOptions<T>

    constructor(
        private readonly firestore: Firestore,
        private readonly collectionPath: string,
        private readonly converter: FirestoreDataConverter<T, SerializedT>,
        private readonly opts?: Partial<FirebaseDataManagerOptions>
    ) {
        // @ts-expect-error - Force merge FirestoreDataConverter and InternalFirestoreDataConverter
        this.mergedConverter = new MergeConverters(this.converter, new FirestoreMetadataConverter())
        this.managerOptions = this.validateOptions({ ...defaultFirebaseDataManagerOptions, ...this.opts })

        this.refCache = this.managerOptions.refCache || new MapCache(100)
        this.listCache = this.managerOptions.listCache || new MapCache(100)

        this.collection = this.firestore
            .collection(this.firestore.app, this.collectionPath)
            .withConverter(this.mergedConverter)

        this.collectionQuery =
            this.managerOptions.deleteMode === 'soft'
                ? queryNotDeleted(this.collection, this.firestore.query, this.firestore.where)
                : this.collection

        this.referenceOptions = {
            readMode: this.managerOptions.readMode,
            snapshotOptions: this.managerOptions.snapshotOptions,
        }
    }

    private validateOptions(options: FirebaseDataManagerOptions): FirebaseDataManagerOptions {
        if (!options.Reference) throw new FirestoreDataManagerError('ReferenceClass not defined')
        if (!options.List) throw new FirestoreDataManagerError('ListClass not defined')

        return options as FirebaseDataManagerOptions & {
            Reference: typeof FirestoreReference
            List: typeof FirestoreList
        }
    }

    public async read(id: string, options?: FirestoreReadOptions): Promise<WithMetadata<T> | undefined> {
        const ref = this.getRef(id)

        if (options?.transaction) {
            const snapshot = await options.transaction.get(this.firestore.doc(this.collection, id))
            if (!checkIfReferenceExists(snapshot)) return undefined
            return snapshot.data(this.referenceOptions.snapshotOptions)
        }
        return await ref.resolve()
    }

    public async create(data: WithFieldValue<WithoutId<T>>, options?: FirebaseCreateOptions) {
        let id: string | undefined = undefined
        if (options?.id) {
            id = options?.id
        } else if (this.managerOptions?.idResolver) {
            id = this.managerOptions.idResolver()
        }

        let docRef: FirestoreTypes.DocumentReference
        let docExists: boolean = false

        if (id) {
            docRef = this.firestore.doc(this.collection, id)
            docExists = await this.preventOverwriteOnCreate(docRef, options)
        } else {
            docRef = this.firestore.doc(this.collection)
        }

        const docDataWithMetadata = {
            ...data,
            [FIRESTORE_KEYS.CREATED_AT]: docExists ? undefined : this.firestore.serverTimestamp(),
            [FIRESTORE_KEYS.UPDATED_AT]: this.firestore.serverTimestamp(),
            [FIRESTORE_KEYS.DELETED]: false,
        }

        const firebaseOptions = { merge: options?.merge }

        if (options?.transaction) {
            options?.transaction.set(docRef, docDataWithMetadata, firebaseOptions)
        } else {
            await this.firestore.setDoc(docRef, docDataWithMetadata, firebaseOptions)
        }

        return this.getRef(docRef.id)
    }

    private async _update(
        id: string,
        data: WithoutId<Partial<WithFieldValue<T & Metadata>>>,
        options?: FirestoreWriteOptions
    ) {
        const extendedData = {
            ...data,
            [FIRESTORE_KEYS.UPDATED_AT]: this.firestore.serverTimestamp(),
        }
        // Firestore update method doesn't call converter like setDoc does, so we need to serialize the data manually.
        const serializedData = this.mergedConverter.toFirestore(extendedData)

        const ref = this.firestore.doc(this.collection, id)

        if (options?.transaction) {
            return options.transaction.update<DocumentData, DocumentData>(ref, serializedData)
        }
        return this.firestore.updateDoc(ref, serializedData)
    }

    public async update(id: string, data: WithoutId<Partial<WithFieldValue<T>>>, options?: FirestoreWriteOptions) {
        await this._update(id, data, options)
    }

    public async upsert(id: string, data: WithFieldValue<WithoutId<T>>, options?: FirestoreWriteOptions) {
        await this.create(data, { ...options, id, merge: true })
    }

    public async count(params?: QueryParams<SerializedT>): Promise<number> {
        const compoundQuery = this._getFilteredQuery(params)
        const result = await this.firestore.getAggregateFromServer(compoundQuery, {
            result: { type: 'count' },
        })
        return result.result ?? 0
    }

    /**
     * Sum the values of a field in the collection
     *
     * NOTE: `field` is resolved against Firestore (serialized) field names.
     * If user model fields differ from serialized fields, this can target a different field than expected.
     */
    public async sum(field: NumericKeys<T>, params?: QueryParams<SerializedT>): Promise<number> {
        const compoundQuery = this._getFilteredQuery(params)
        const result = await this.firestore.getAggregateFromServer(compoundQuery, {
            result: { type: 'sum', field },
        })
        return result.result ?? 0
    }

    /**
     * Calculate the average value of a field in the collection.
     *
     * NOTE: `field` is resolved against Firestore (serialized) field names.
     * If user model fields differ from serialized fields, this can target a different field than expected.
     */
    public async average(field: NumericKeys<T>, params?: QueryParams<SerializedT>): Promise<number | null> {
        const compoundQuery = this._getFilteredQuery(params)
        const result = await this.firestore.getAggregateFromServer(compoundQuery, {
            result: { type: 'average', field },
        })
        return result.result ?? null
    }

    /**
     * Read the minimum value for a field in the collection.
     *
     * NOTE: `field` is resolved against Firestore (serialized) field names.
     * If user model fields differ from serialized fields, this can target a different field than expected.
     */
    public async min<K extends string & keyof T>(field: K, params?: QueryParams<SerializedT>): Promise<T[K] | null> {
        const compoundQuery = this._getFilteredQuery(params)
        const limitedQuery = this.firestore.query(
            this.firestore.query(compoundQuery, this.firestore.orderBy(field, 'asc')),
            this.firestore.limit(1)
        )
        const snapshot = await this.firestore.getDocs(limitedQuery)
        if (snapshot.empty) return null
        return (snapshot.docs[0].get(field) as T[K]) ?? null
    }

    /**
     * Read the maximum value for a field in the collection.
     *
     * NOTE: `field` is resolved against Firestore (serialized) field names.
     * If user model fields differ from serialized fields, this can target a different field than expected.
     */
    public async max<K extends string & keyof T>(field: K, params?: QueryParams<SerializedT>): Promise<T[K] | null> {
        const compoundQuery = this._getFilteredQuery(params)
        const limitedQuery = this.firestore.query(
            this.firestore.query(compoundQuery, this.firestore.orderBy(field, 'desc')),
            this.firestore.limit(1)
        )
        const snapshot = await this.firestore.getDocs(limitedQuery)
        if (snapshot.empty) return null
        return (snapshot.docs[0].get(field) as T[K]) ?? null
    }

    public async exists(id: string) {
        const ref = this.firestore.doc(this.collection, id)
        const snapshot = await this.firestore.getDoc(ref)
        return checkIfReferenceExists(snapshot)
    }

    public async delete(id: string, options?: FirestoreWriteOptions) {
        if (this.managerOptions.deleteMode === 'soft') {
            await this._update(
                id,
                {
                    ...({} as Partial<T>),
                    [FIRESTORE_KEYS.DELETED]: true,
                },
                options
            )
            return
        }
        if (options?.transaction) {
            options.transaction.delete(this.firestore.doc(this.collection, id))
        } else {
            await this.firestore.deleteDoc(this.firestore.doc(this.collection, id))
        }
    }

    public getRef(id: string) {
        if (this.refCache.has(id) && !this.managerOptions.disableCache) {
            return this.refCache.get(id)!
        }

        const newRef = new this.managerOptions.Reference(
            this.firestore,
            this.firestore.doc(this.collection, id),
            this.referenceOptions
        )

        if (!this.managerOptions.disableCache) {
            this.refCache.set(id, newRef)
        }
        return newRef
    }

    private _getFilteredQuery(params?: QueryParams<SerializedT>) {
        let compoundQuery = this.collectionQuery

        params?.filters?.forEach(filter => {
            compoundQuery = this.firestore.query(compoundQuery, this.firestore.where(filter[0], filter[1], filter[2]))
        })

        params?.orderBy?.forEach(orderBy => {
            compoundQuery = this.firestore.query(compoundQuery, this.firestore.orderBy(orderBy[0], orderBy[1]))
        })

        return compoundQuery
    }

    public getList(params?: QueryParams<SerializedT> & ListPaginationParams) {
        const compoundQuery = this._getFilteredQuery(params)

        const key = JSON.stringify(params || {})
        if (this.listCache.has(key) && !this.managerOptions.disableCache) {
            return this.listCache.get(key)!
        }
        const newList = new this.managerOptions.List(this.firestore, compoundQuery, {
            readMode: this.managerOptions.readMode,
            ...params,
        })
        if (!this.managerOptions.disableCache) {
            this.listCache.set(key, newList)
        }
        return newList
    }

    private async preventOverwriteOnCreate(docRef: FirestoreTypes.DocumentReference, createOptions?: CreateOptions) {
        if (!this.managerOptions.preventOverwriteOnCreate) return false

        const doc = await this.firestore.getDoc(docRef)
        const docExists = checkIfReferenceExists(doc)

        if (docExists && createOptions?.merge !== true) {
            throw new FirestoreDataManagerError(
                `Cannot create document at "${doc.ref.path}": document already exists. Use 'merge: true' or disable 'preventOverwriteOnCreate' to allow overwriting.`
            )
        }

        return docExists
    }
}
