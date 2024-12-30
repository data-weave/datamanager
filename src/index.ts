import { FirebaseFirestore, FirestoreDataConverter, QueryDocumentSnapshot, CollectionReference, DocumentData, DocumentReference, SnapshotOptions, SetOptions } from "@firebase/firestore-types"
import { IdentifiableReference, Reference } from "./utils"

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { firestore } from "firebase-admin";

interface CreateOptions {
    id?: string
    merge?: boolean
}

export abstract class DataManager<T> {

    public abstract read(id: string): Promise<T | undefined>;
    public abstract create(data: T, options?: CreateOptions): Promise<void>;
    public abstract delete(id: string): Promise<void>;
    public abstract update(id: string, data: T): Promise<void>;

    public abstract getRef(id: string): IdentifiableReference<T>;
    public abstract upsert(id: string, data: T): Promise<void>;
}

const FIRESTORE_DELETE_KEY = "__deleted"
const FIRESTORE_CREATED_AT_KEY = "__createdAt"
const FIRESTORE_UPDATED_AT_KEY = "__updatedAt"

interface FirebaseDataManagerOptions {
    idResolver?: () => string
}

interface FirestoreMetadata {
    id: string
    createdAt: Date
    updatedAt: Date
    deleted: boolean
    // TODO: Consider adding versioning ot this
    // firestoreDataManagerVersion: string
}

class FirestoreMetadataConverter implements FirestoreDataConverter<FirestoreMetadata> {
    toFirestore(data: FirestoreMetadata, options?: SetOptions): DocumentData {
        return {
            [FIRESTORE_UPDATED_AT_KEY]: data.updatedAt,
            [FIRESTORE_CREATED_AT_KEY]: data.createdAt, 
            [FIRESTORE_DELETE_KEY]: data.deleted,
        }
    }
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): FirestoreMetadata {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            createdAt: data[FIRESTORE_CREATED_AT_KEY].toDate(),
            updatedAt: data[FIRESTORE_UPDATED_AT_KEY].toDate(),
            deleted: data[FIRESTORE_DELETE_KEY]
        }
    }

}

class mergeConverters<T, G> implements FirestoreDataConverter<T & G> {
    constructor(
        private converter1: FirestoreDataConverter<T>,
        private converter2: FirestoreDataConverter<G>) {}

    toFirestore(modelObject: T & G, options?: SetOptions): DocumentData {
        if (options) {
            return { ...this.converter1.toFirestore(modelObject, options), ...this.converter2.toFirestore(modelObject, options) }
        } else {
            return { ...this.converter1.toFirestore(modelObject), ...this.converter2.toFirestore(modelObject) }
        }
    }

    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T & G {
        return { ...this.converter1.fromFirestore(snapshot, options), ...this.converter2.fromFirestore(snapshot, options) }
    }

}

type WithMetadata<T> = T & FirestoreMetadata

// type FullyQualifiedDocumentData<T> = Omit<WithMetadata<T>, 'id'>

class FirebaseDataManager<T extends object> implements DataManager<T> {

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
        await this.collection.doc(id).update({...data})
    }
    public getRef(id: string): IdentifiableReference<WithMetadata<T>> {
        return new FirestoreReference(this.collection.doc(id), {})
    }
    public async upsert(id: string, data: T): Promise<void> {
        this.create(data, {id, merge: true})
    }
}

interface FirestoreReferenceOptions {
    mode?: 'realtime' | 'static'
    onUpdate?: () => void
}

class FirestoreReference<T> implements Reference<T> {
    public value: T | undefined;
    public resolved: boolean = false;
    private unsubscribeFromSnapshot: undefined | (() => void)


    constructor(
        private readonly doc: DocumentReference<T>,
        private readonly options: FirestoreReferenceOptions
    ) {
    }

    public get id(): string {
        return this.doc.id;
    }

    public async resolve(): Promise<T | undefined> {
        if (this.options?.mode === 'realtime') {
            this.unsubscribeFromSnapshot = this.doc.onSnapshot((documentSnapshot) => {
                const data = documentSnapshot.data()
                this.setValue(data)
                if (this.options.onUpdate) {
                    this.options.onUpdate()
                }
            })
        }
        else {
            const doc = await this.doc.get();
            this.setValue(await doc.data())
            return this.value;
        }

    }

    public unSubscribe() {
        if (this.unsubscribeFromSnapshot) {
            this.unsubscribeFromSnapshot();
        }
    }

    private setValue(value: T | undefined) {
        this.value = value;
        this.resolved = true;
    }
}


interface Product {
    name: string
    desciption: string
}

const productConverter: FirestoreDataConverter<Product> = {
    toFirestore: function (modelObject: Product): DocumentData {
        return {
            name: modelObject.name
        }
    },
    fromFirestore: function (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Product {
        const data = snapshot.data(options);
        return {
            name: data.name,
            desciption: data.desciption
        }
    }
}

const main = async () => {
    const app = initializeApp({
        credential: applicationDefault(),
        // databaseURL: 'https://<DATABASE_NAME>.firebaseio.com'
    });
    const db = firestore()
    const productDatamanger = new FirebaseDataManager<Product>(db as any, 'products', productConverter)
    const ref = productDatamanger.getRef("apples")
    const product = await ref.resolve();
    // const product = await productDatamanger.read("QQ2Wtq9OxS8RkqC6Tl0b");
    console.log(product)
}
main();