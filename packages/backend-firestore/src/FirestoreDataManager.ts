import {
    Cache,
    CreateOptions,
    DataManager,
    IdentifiableReference,
    List,
    ListPaginationParams,
    MapCache,
    Metadata,
    WithMetadata,
    WithoutId,
} from '@data-weave/datamanager'
import { FirestoreList, FirestoreListContext } from './FirestoreList'
import { DefaultConverter, FIRESTORE_KEYS, FirestoreSerializedMetadata, MetadataConverter } from './FirestoreMetadata'
import { FirestoreReference, FirestoreReferenceContext } from './FirestoreReference'
import {
    CollectionReference,
    DocumentData,
    DocumentReference,
    FilterBy,
    FirebaseCreateOptions,
    Firestore,
    FirestoreDataConverter,
    FirestoreReadMode,
    FirestoreReadOptions,
    FirestoreWriteOptions,
    OrderBy,
    Query,
    SnapshotOptions,
    UpdateData,
    WithFieldValue,
} from './firestoreTypes'
import { MergeConverters, checkIfReferenceExists, queryNotDeleted } from './utils'

export type FirebaseDataManagerDeleteMode = 'soft' | 'hard'

export interface FirebaseDataManagerOptions<T extends DocumentData, SerializedT extends DocumentData = T> {
    readonly idResolver?: () => string
    readonly deleteMode?: FirebaseDataManagerDeleteMode
    readonly readMode?: FirestoreReadMode
    readonly preventOverwriteOnCreate?: boolean
    readonly errorInterceptor?: (error: unknown, ctx: FirestoreReferenceContext | FirestoreListContext) => void
    readonly snapshotOptions?: SnapshotOptions
    // TODO: Add preventUpdateIfNotExists?
    readonly Reference?: typeof FirestoreReference
    readonly List?: typeof FirestoreList
    readonly listCache?: Cache
    readonly refCache?: Cache
    readonly disableCache?: boolean
    readonly converter?: FirestoreDataConverter<T, SerializedT>
}

const defaultFirebaseDataManagerOptions: FirebaseDataManagerOptions<DocumentData, DocumentData> = {
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

export class FirestoreDataManager<T extends DocumentData, SerializedT extends DocumentData = T>
    implements DataManager<T & Metadata>
{
    private converter: FirestoreDataConverter<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private collection: CollectionReference<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private collectionQuery: Query<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private managerOptions: FirebaseDataManagerOptions<T, SerializedT>

    private refCache: Cache<string, IdentifiableReference<WithMetadata<T>>>
    private listCache: Cache<string, List<WithMetadata<T>>>

    constructor(
        private readonly firestore: Firestore,
        private readonly collectionPath: string,
        private readonly opts?: FirebaseDataManagerOptions<T, SerializedT>
    ) {
        const dataConverter = opts?.converter ?? new DefaultConverter<T, SerializedT>()
        this.converter = new MergeConverters(dataConverter, new MetadataConverter())
        this.managerOptions = Object.assign(defaultFirebaseDataManagerOptions, this.opts)

        this.refCache = this.managerOptions.refCache || new MapCache(100)
        this.listCache = this.managerOptions.listCache || new MapCache(100)

        this.collection = this.firestore
            .collection(this.firestore.app, this.collectionPath)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .withConverter(this.converter as any) as any

        this.collectionQuery =
            this.managerOptions.deleteMode === 'soft'
                ? queryNotDeleted<T & Metadata, SerializedT & FirestoreSerializedMetadata>(
                      this.collection,
                      this.firestore.query,
                      this.firestore.where
                  )
                : this.collection
    }

    public async read(id: string, options?: FirestoreReadOptions): Promise<WithMetadata<T> | undefined> {
        if (!this.managerOptions?.Reference) throw new Error('ReferenceClass not defined')

        const ref = this.getRef(id)

        if (options?.transaction) {
            const snapshot = await options.transaction.get<WithMetadata<T>, DocumentData>(
                this.firestore.doc(this.collection, id)
            )
            if (!checkIfReferenceExists(snapshot)) return undefined
            return snapshot.data()
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

        let docRef: DocumentReference
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

    private async _update(id: string, data: UpdateData<T & Metadata>, options?: FirestoreWriteOptions) {
        const extendedData = {
            ...data,
            [FIRESTORE_KEYS.UPDATED_AT]: this.firestore.serverTimestamp(),
        }
        // Firestore update method doesn't call converter like setDoc does, so we need to serialize the data manually.
        const serializedData = this.converter.toFirestore(extendedData)

        const ref = this.firestore.doc(this.collection, id)

        if (options?.transaction) {
            return options.transaction.update<DocumentData, DocumentData>(ref, serializedData)
        }
        // Cast due to manual converter use
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.firestore.updateDoc(ref as any, serializedData as any)
    }

    public async update(id: string, data: Partial<T>, options?: FirestoreWriteOptions) {
        await this._update(id, data, options)
    }

    public async updateWithFieldValue(id: string, data: UpdateData<T>, options?: FirestoreWriteOptions) {
        await this._update(id, data, options)
    }

    public async upsert(id: string, data: WithFieldValue<WithoutId<T>>, options?: FirestoreWriteOptions) {
        this.create(data, { ...options, id, merge: true })
    }

    public async delete(id: string, options?: FirestoreWriteOptions) {
        if (this.managerOptions.deleteMode === 'soft') {
            await this._update(
                id,
                {
                    deleted: true,
                } as UpdateData<T & Metadata>,
                options
            )
            return
        }
        return this.firestore.deleteDoc(this.firestore.doc(this.collection, id))
    }

    public getRef(id: string) {
        if (!this.managerOptions?.Reference) throw new Error('ReferenceClass not defined')

        if (this.refCache.has(id) && !this.managerOptions.disableCache) {
            return this.refCache.get(id)!
        }

        const newRef = new this.managerOptions.Reference(this.firestore, this.firestore.doc(this.collection, id), {
            readMode: this.managerOptions.readMode,
            errorInterceptor: this.managerOptions.errorInterceptor,
            snapshotOptions: this.managerOptions.snapshotOptions,
        })
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
        if (!this.managerOptions.List) throw new Error('ListClass not defined')

        const compoundQuery = this._getFilteredQuery(params)

        const key = JSON.stringify(params || {})
        if (this.listCache.has(key) && !this.managerOptions.disableCache) {
            return this.listCache.get(key)!
        }
        const newList = new this.managerOptions.List(this.firestore, compoundQuery, {
            readMode: this.managerOptions.readMode,
            errorInterceptor: this.managerOptions.errorInterceptor,
            ...params,
        })
        if (!this.managerOptions.disableCache) {
            this.listCache.set(key, newList)
        }
        return newList
    }

    private async preventOverwriteOnCreate(docRef: DocumentReference, createOptions?: CreateOptions) {
        const doc = await this.firestore.getDoc(docRef)
        const docExists = checkIfReferenceExists(doc)
        if (docExists && this.managerOptions.preventOverwriteOnCreate && createOptions?.merge !== true) {
            throw new Error(`Document already exists - ${doc.ref.path}`)
        }
        return docExists
    }
}
