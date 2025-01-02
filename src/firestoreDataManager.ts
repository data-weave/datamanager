import { FIRESTORE_INTERAL_KEYS, FirestoreMetadata, FirestoreMetadataConverter } from './firestoreMetadata'
import { CreateOptions, DataManager } from './dataManager'
import { mergeConverters } from './utils'
import { IdentifiableReference } from './reference'
import { FirestoreReference, FirestoreReferenceReadMode } from './firestoreReference'
import { CollectionReference, Firestore, FirestoreDataConverter } from './firestoreAppCompatTypes'

export interface FirebaseDataManagerOptions {
    idResolver?: () => string
    referenceReadMode?: FirestoreReferenceReadMode
    ReferenceClass?: typeof FirestoreReference
}

const defaultFirebaseDataManagerOptions: FirebaseDataManagerOptions = {
    referenceReadMode: 'static',
    ReferenceClass: FirestoreReference,
}

type WithMetadata<T> = T & FirestoreMetadata

export class FirebaseDataManager<T extends object> implements DataManager<T> {
    private collection: CollectionReference<WithMetadata<T>>
    private options: FirebaseDataManagerOptions
    constructor(
        readonly firestore: Firestore,
        readonly collectionPath: string,
        readonly converter: FirestoreDataConverter<T>,
        readonly opts?: FirebaseDataManagerOptions
    ) {
        const mergedConverter = new mergeConverters(converter, new FirestoreMetadataConverter())
        this.collection = firestore.collection(collectionPath).withConverter(mergedConverter)
        this.options = Object.assign(defaultFirebaseDataManagerOptions, opts)
    }
    public async read(id: string): Promise<WithMetadata<T> | undefined> {
        const ref = this.getRef(id)
        return await ref.resolve()
    }
    public async create(data: T, createOptions?: CreateOptions) {
        let id: string | undefined = undefined
        if (createOptions?.id) {
            id = createOptions?.id
        } else if (this.options?.idResolver) {
            id = this.options.idResolver()
        }
        // TODO: Check if doc exists and if it does then what?
        let docRef = this.collection.doc()
        if (id) {
            docRef = this.collection.doc(id)
        }
        // TODO: Use server timestamp
        await docRef.set(
            {
                ...data,
                createdAt: new Date(),
                updatedAt: new Date(),
                deleted: false,
            },
            { merge: createOptions?.merge }
        )
        return this.getRef(docRef.id)
    }
    public async delete(id: string): Promise<void> {
        this.collection.doc(id).update({ [FIRESTORE_INTERAL_KEYS.DELETED]: true })
    }
    public async update(id: string, data: Partial<T>): Promise<void> {
        await this.collection.doc(id).update({ ...data, [FIRESTORE_INTERAL_KEYS.UPDATED_AT]: new Date() })
    }
    public getRef(id: string): IdentifiableReference<WithMetadata<T>> {
        if (!this.options.ReferenceClass) throw new Error('ReferenceClass not defined')
        return new this.options.ReferenceClass(this.collection.doc(id), {
            mode: this.options.referenceReadMode,
        })
    }
    public async upsert(id: string, data: T): Promise<void> {
        this.create(data, { id, merge: true })
    }
}
