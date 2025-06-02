import { injectable } from 'inversify'

import { FirestoreList } from './FirestoreList'
import {
    FIRESTORE_KEYS,
    FirestoreMetadataConverter,
    FirestoreSerializedMetadata,
    queryNotDeleted,
} from './FirestoreMetadata'
import { FirestoreReference } from './FirestoreReference'
import {
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
} from './FirestoreTypes'
import { MergeConverters } from './utils'
import { CreateOptions, DataManager, Metadata, WithMetadata } from './DataManager'
import { IdentifiableReference, WithoutId } from './Reference'
import { List, ListPaginationParams } from './List'

export type FirebaseDataManagerDeleteMode = 'soft' | 'hard'

export interface FirebaseDataManagerOptions {
    readonly idResolver?: () => string
    readonly deleteMode?: FirebaseDataManagerDeleteMode
    readonly readMode?: FirestoreReadMode
    readonly preventOverwriteOnCreate?: boolean
    // TODO: Add preventUpdateIfNotExists?
    readonly ReferenceClass?: typeof FirestoreReference
    readonly ListClass?: typeof FirestoreList
}

const defaultFirebaseDataManagerOptions: FirebaseDataManagerOptions = {
    deleteMode: 'soft',
    preventOverwriteOnCreate: true,
    readMode: 'static',
    ReferenceClass: FirestoreReference,
    ListClass: FirestoreList,
}

export interface QueryParams<T extends FirestoreTypes.DocumentData> {
    readonly filters?: Array<FilterBy<T & FirestoreSerializedMetadata>>
    readonly orderBy?: Array<OrderBy<T & FirestoreSerializedMetadata>>
}

@injectable()
export class FirestoreDataManager<
    T extends FirestoreTypes.DocumentData,
    SerializedT extends FirestoreTypes.DocumentData,
> implements DataManager<T>
{
    private mergedConverter: InternalFirestoreDataConverter<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private collection: FirestoreTypes.CollectionReference<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private collectionQuery: FirestoreTypes.Query<T & Metadata, SerializedT & FirestoreSerializedMetadata>
    private managerOptions: FirebaseDataManagerOptions

    // TODO: Consider a proper cache
    private refMap: Map<string, IdentifiableReference<WithMetadata<T>>> = new Map()
    private listMap: Map<string, List<WithMetadata<T>>> = new Map()

    constructor(
        readonly firestore: Firestore,
        readonly collectionPath: string,
        readonly converter: FirestoreDataConverter<T, SerializedT>,
        readonly opts?: FirebaseDataManagerOptions
    ) {
        // @ts-expect-error - Force merge FirestoreDataConverter and InternalFirestoreDataConverter
        this.mergedConverter = new MergeConverters(converter, new FirestoreMetadataConverter())
        this.managerOptions = Object.assign(defaultFirebaseDataManagerOptions, opts)

        this.collection = this.firestore
            .collection(this.firestore.app, this.collectionPath)
            .withConverter(this.mergedConverter)

        console.log('collection', this.collection)

        this.collectionQuery =
            this.managerOptions.deleteMode === 'soft'
                ? queryNotDeleted(this.collection, this.firestore.query, this.firestore.where)
                : this.collection
    }

    public async read(id: string, options?: FirestoreReadOptions): Promise<WithMetadata<T> | undefined> {
        if (!this.managerOptions?.ReferenceClass) throw new Error('ReferenceClass not defined')

        const ref = this.getRef(id)

        if (options?.transaction) {
            const snapshot = await options.transaction.get(this.firestore.doc(this.collection, id))
            if (!snapshot.exists()) return undefined
            // @ts-expect-error - TODO:
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

        let docRef = this.firestore.doc(this.collection)
        if (id) {
            docRef = this.firestore.doc(this.collection, id)
            await this.preventOverwriteOnCreate(docRef, options)
        }

        const extendedData = {
            ...data,
            [FIRESTORE_KEYS.CREATED_AT]: this.firestore.serverTimestamp(),
            [FIRESTORE_KEYS.UPDATED_AT]: this.firestore.serverTimestamp(),
            [FIRESTORE_KEYS.DELETED]: false,
        }

        const firebaseOptions = { merge: options?.merge }

        if (options?.transaction) {
            options?.transaction.set(docRef, extendedData, firebaseOptions)
        } else {
            await this.firestore.setDoc(docRef, extendedData, firebaseOptions)
        }

        return this.getRef(docRef.id)
    }

    private async _update(id: string, data: Partial<WithFieldValue<WithoutId<T>>>, options?: FirestoreWriteOptions) {
        const extendedData = {
            ...data,
            [FIRESTORE_KEYS.UPDATED_AT]: this.firestore.serverTimestamp(),
        } as Partial<WithFieldValue<WithoutId<T & Metadata>>>

        const serializedData = this.mergedConverter.toFirestore(extendedData)

        const ref = this.firestore.doc(this.collection, id)

        if (options?.transaction) {
            // @ts-expect-error - TODO: Investigate type discrepancy between updateDoc and setDoc above
            return options.transaction.update(ref, serializedData)
        }
        return this.firestore.updateDoc(ref, serializedData)
    }

    public async update(id: string, data: Partial<WithFieldValue<WithoutId<T>>>, options?: FirestoreWriteOptions) {
        await this._update(id, data, options)
    }

    public async upsert(id: string, data: WithFieldValue<WithoutId<T>>, options?: FirestoreWriteOptions) {
        this.create(data, { ...options, id, merge: true })
    }

    public async delete(id: string, options?: FirestoreWriteOptions) {
        await this._update(id, {}, options)
    }

    public getRef(id: string) {
        if (!this.managerOptions?.ReferenceClass) throw new Error('ReferenceClass not defined')

        if (this.refMap.has(id)) {
            return this.refMap.get(id)!
        }

        const newRef = new this.managerOptions.ReferenceClass(this.firestore, this.firestore.doc(this.collection, id), {
            readMode: this.managerOptions.readMode,
            // TODO: fix type
        }) as IdentifiableReference<WithMetadata<T>>
        this.refMap.set(id, newRef)
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
        if (!this.managerOptions.ListClass) throw new Error('ListClass not defined')

        const compoundQuery = this._getFilteredQuery(params)

        const key = JSON.stringify(params || {})
        if (this.listMap.has(key)) {
            return this.listMap.get(key)!
        }
        const newList = new this.managerOptions.ListClass(this.firestore, compoundQuery, {
            readMode: this.managerOptions.readMode,
            ...params,
        })
        this.listMap.set(key, newList)
        return newList
    }

    private async preventOverwriteOnCreate(docRef: FirestoreTypes.DocumentReference, createOptions?: CreateOptions) {
        if (this.managerOptions.preventOverwriteOnCreate && createOptions?.merge !== true) {
            const doc = await this.firestore.getDoc(docRef)
            if (doc.exists()) {
                throw new Error(`Document already exists - ${doc.ref.path}`)
            }
        }
    }
}
