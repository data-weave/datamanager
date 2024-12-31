import { FirebaseFirestore, CollectionReference, DocumentData, FirestoreDataConverter } from "@firebase/firestore-types"
import { FIRESTORE_DELETE_KEY, FirestoreMetadata, FirestoreMetadataConverter } from "./firestoreMetadata"
import { CreateOptions, DataManager } from "./dataManager"
import { mergeConverters } from "./utils"
import { IdentifiableReference } from "./reference"
import { FirestoreReference } from "./firestoreReference"


interface FirebaseDataManagerOptions {
    idResolver?: () => string
}

type WithMetadata<T> = T & FirestoreMetadata

export class FirebaseDataManager<T extends object> implements DataManager<T> {

    private collection: CollectionReference<WithMetadata<T>, DocumentData>


    constructor(
        private readonly firestore: FirebaseFirestore,
        collectionPath: string,
        converter: FirestoreDataConverter<T>,
        readonly options?: FirebaseDataManagerOptions
    ) {
        const mergedConverter = new mergeConverters(converter, new FirestoreMetadataConverter())
        this.collection = firestore.collection(collectionPath).withConverter(mergedConverter)

    }
    public async read(id: string): Promise<WithMetadata<T> | undefined> {
        const ref = this.getRef(id);
        return await ref.resolve();
    }
    public async create(data: T, createOptions?: CreateOptions): Promise<void> {
        let id: string | undefined = undefined;
        if (createOptions?.id) {
            id = createOptions?.id
        } else if (this.options?.idResolver) {
            id = this.options.idResolver()
        }
        // TODO: Check if doc exists and if it does then what?
        let docRef = this.collection.doc()
        if(id){
            docRef = this.collection.doc(id)
        }
        // TODO: Use server timestamp
        await docRef.set({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            deleted: false,
        }, 
         {merge: createOptions?.merge})
    }
    public async delete(id: string): Promise<void> {
        this.collection.doc(id).update({[FIRESTORE_DELETE_KEY]: true})
    }
    public async update(id: string, data: T): Promise<void> {
        await this.collection.doc(id).update(data)
    }
    public getRef(id: string): IdentifiableReference<WithMetadata<T>> {
        return new FirestoreReference(this.collection.doc(id), {})
    }
    public async upsert(id: string, data: T): Promise<void> {
        this.create(data, {id, merge: true})
    }
}
