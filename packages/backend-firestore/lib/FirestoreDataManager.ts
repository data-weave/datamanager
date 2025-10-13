import { injectable } from 'inversify'

import { Cache, MapCache } from '@data-weave/datamanager/lib/Cache'
import { CreateOptions, DataManager, Metadata, WithMetadata } from '@data-weave/datamanager/lib/DataManager'
import { List, ListPaginationParams } from '@data-weave/datamanager/lib/List'
import { IdentifiableReference, WithoutId } from '@data-weave/datamanager/lib/Reference'
import { FirestoreList } from './FirestoreList'
import {
    FIRESTORE_KEYS,
    FirestoreMetadataConverter,
    FirestoreSerializedMetadata,
    queryNotDeleted,
} from './FirestoreMetadata'
import { FirestoreReference } from './FirestoreReference'
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
    readonly deleteMode?: FirebaseDataManagerDeleteMode
    readonly readMode?: FirestoreReadMode
    readonly preventOverwriteOnCreate?: boolean
    // TODO: Add preventUpdateIfNotExists?
    readonly Reference?: typeof FirestoreReference
    readonly List?: typeof FirestoreList
    readonly listCache?: Cache
    readonly refCache?: Cache
}

const defaultFirebaseDataManagerOptions: FirebaseDataManagerOptions = {
    deleteMode: 'soft',
    preventOverwriteOnCreate: true,
    readMode: 'static',
    Reference: FirestoreReference,
    List: FirestoreList,
}

export interface QueryParams<T extends FirestoreTypes.DocumentData> {
    readonly filters?: Array<FilterBy<T & FirestoreSerializedMetadata>>
    readonly orderBy?: Array<OrderBy<T & FirestoreSerializedMetadata>>
}

@injectable()
export class FirestoreDataManager<
    T extends FirestoreTypes.DocumentData,
    SerializedT extends FirestoreTypes.DocumentData = T,
> implements DataManager<T>
{
    private mergedConverter: InternalFirestoreDataConverter<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private collection: FirestoreTypes.CollectionReference<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private collectionQuery: FirestoreTypes.Query<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private managerOptions: FirebaseDataManagerOptions

    private refCache: Cache<string, IdentifiableReference<WithMetadata<T>>>
    private listCache: Cache<string, List<WithMetadata<T>>>

    constructor(
        private readonly firestore: Firestore,
        private readonly collectionPath: string,
        private readonly converter: FirestoreDataConverter<T, SerializedT>,
        private readonly opts?: FirebaseDataManagerOptions
    ) {
        // @ts-expect-error - Force merge FirestoreDataConverter and InternalFirestoreDataConverter
        this.mergedConverter = new MergeConverters(this.converter, new FirestoreMetadataConverter())
        this.managerOptions = Object.assign(defaultFirebaseDataManagerOptions, this.opts)

        this.refCache = this.managerOptions.refCache || new MapCache(100)
        this.listCache = this.managerOptions.listCache || new MapCache(100)

        this.collection = this.firestore
            .collection(this.firestore.app, this.collectionPath)
            .withConverter(this.mergedConverter)

        this.collectionQuery =
            this.managerOptions.deleteMode === 'soft'
                ? queryNotDeleted(this.collection, this.firestore.query, this.firestore.where)
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
        this.create(data, { ...options, id, merge: true })
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
        return this.firestore.deleteDoc(this.firestore.doc(this.collection, id))
    }

    public getRef(id: string) {
        if (!this.managerOptions?.Reference) throw new Error('ReferenceClass not defined')

        if (this.refCache.has(id)) {
            return this.refCache.get(id)!
        }

        const newRef = new this.managerOptions.Reference(this.firestore, this.firestore.doc(this.collection, id), {
            readMode: this.managerOptions.readMode,
        })
        this.refCache.set(id, newRef)
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
        if (this.listCache.has(key)) {
            return this.listCache.get(key)!
        }
        const newList = new this.managerOptions.List(this.firestore, compoundQuery, {
            readMode: this.managerOptions.readMode,
            ...params,
        })
        this.listCache.set(key, newList)
        return newList
    }

    private async preventOverwriteOnCreate(docRef: FirestoreTypes.DocumentReference, createOptions?: CreateOptions) {
        const doc = await this.firestore.getDoc(docRef)
        const docExists = checkIfReferenceExists(doc)
        if (docExists && this.managerOptions.preventOverwriteOnCreate && createOptions?.merge !== true) {
            throw new Error(`Document already exists - ${doc.ref.path}`)
        }
        return docExists
    }
}
