import { FIRESTORE_KEYS, FirestoreMetadata, FirestoreMetadataConverter, queryNotDeleted } from './firestoreMetadata'
import { CreateOptions, DataManager } from './dataManager'
import { MergeConverters } from './utils'
import { IdentifiableReference } from './reference'
import { FirestoreReference } from './firestoreReference'
import {
    CollectionReference,
    DocumentReference,
    FieldValue,
    Firestore,
    FirestoreDataConverter,
    WithFieldValue,
    FirestoreReadMode,
    Query,
} from './firestoreAppCompatTypes'
import { List } from './List'
import { FirestoreList } from './FirestoreList'

export type FirebaseDataManagerDeleteMode = 'soft' | 'hard'

export interface FirebaseDataManagerOptions {
    idResolver?: () => string
    deleteMode?: FirebaseDataManagerDeleteMode
    readMode?: FirestoreReadMode
    preventOverwriteOnCreate?: boolean
    ReferenceClass?: typeof FirestoreReference
    ListClass?: typeof FirestoreList
}

type WithMetadata<T> = T & FirestoreMetadata

const defaultFirebaseDataManagerOptions: FirebaseDataManagerOptions = {
    deleteMode: 'soft',
    preventOverwriteOnCreate: false,
    readMode: 'static',
    ReferenceClass: FirestoreReference,
    ListClass: FirestoreList,
}

export class FirebaseDataManager<T extends object, S extends object = T> implements DataManager<T> {
    private mergedConverter: MergeConverters<T, FirestoreMetadata>
    private collection: CollectionReference<WithMetadata<T>>
    private collectionQuery: Query<WithMetadata<T>>
    private options: FirebaseDataManagerOptions
    private refMap: Map<string, IdentifiableReference<WithMetadata<T>>> = new Map()
    private listMap: Map<string, List<WithMetadata<T>>> = new Map()

    constructor(
        readonly Firestore: Firestore,
        readonly FieldValue: FieldValue,
        readonly collectionPath: string,
        readonly converter: FirestoreDataConverter<T, S>,
        readonly opts?: FirebaseDataManagerOptions
    ) {
        this.mergedConverter = new MergeConverters(converter, new FirestoreMetadataConverter())
        this.options = Object.assign(defaultFirebaseDataManagerOptions, opts)
        this.collection = Firestore.collection(collectionPath).withConverter(this.mergedConverter)
        this.collectionQuery = this.options.deleteMode === 'soft' ? queryNotDeleted(this.collection) : this.collection
    }
    public async read(id: string): Promise<WithMetadata<T> | undefined> {
        const ref = this.getRef(id)
        return await ref.resolve()
    }
    public async create(data: WithFieldValue<T>, createOptions?: CreateOptions) {
        let id: string | undefined = undefined
        if (createOptions?.id) {
            id = createOptions?.id
        } else if (this.options?.idResolver) {
            id = this.options.idResolver()
        }

        let docRef = this.collection.doc()
        if (id) {
            docRef = this.collection.doc(id)
            await this.preventOverwriteOnCreate(docRef, createOptions)
        }

        await docRef.set(
            {
                ...data,
                [FIRESTORE_KEYS.CREATED_AT]: this.FieldValue.serverTimestamp(),
                [FIRESTORE_KEYS.UPDATED_AT]: this.FieldValue.serverTimestamp(),
                [FIRESTORE_KEYS.DELETED]: false,
            },
            { merge: createOptions?.merge }
        )
        return this.getRef(docRef.id)
    }

    private async _update(id: string, data: Partial<WithFieldValue<T> | Partial<FirestoreMetadata>>): Promise<void> {
        await this.collection.doc(id).update(
            this.mergedConverter.toFirestore({
                ...data,
                [FIRESTORE_KEYS.UPDATED_AT]: this.FieldValue.serverTimestamp(),
            } as WithMetadata<T>)
        )
    }

    public async update(id: string, data: Partial<WithFieldValue<T>>): Promise<void> {
        await this._update(id, data)
    }

    public async upsert(id: string, data: T): Promise<void> {
        this.create(data, { id, merge: true })
    }

    public async delete(id: string): Promise<void> {
        await this._update(id, { [FIRESTORE_KEYS.DELETED]: true })
    }

    public getRef(id: string): IdentifiableReference<WithMetadata<T>> {
        if (!this.options.ReferenceClass) throw new Error('ReferenceClass not defined')

        // TODO: Consider a proper cache
        if (this.refMap.has(id)) {
            return this.refMap.get(id)!
        }
        const newRef = new this.options.ReferenceClass(this.collection.doc(id), {
            readMode: this.options.readMode,
        })
        this.refMap.set(id, newRef)
        return newRef
    }

    public getList(filters?: object): List<WithMetadata<T>> {
        if (!this.options.ListClass) throw new Error('ListClass not defined')

        // TODO: Consider a proper cache
        const key = JSON.stringify(filters || {})
        if (this.listMap.has(key)) {
            return this.listMap.get(key)!
        }
        const newList = new this.options.ListClass(this.collectionQuery, { readMode: this.options.readMode })
        this.listMap.set(key, newList)
        return newList
    }

    private async preventOverwriteOnCreate(docRef: DocumentReference, createOptions?: CreateOptions): Promise<void> {
        if (this.options.preventOverwriteOnCreate && !createOptions?.merge) {
            const doc = await docRef.get()
            if (doc.exists) {
                throw new Error('Document already exists')
            }
        }
    }
}
