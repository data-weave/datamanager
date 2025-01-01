import { FirebaseDataManager } from '../firestoreDataManager'
import { Firestore, FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions } from '../firestoreAppCompatTypes'
import { WithMetadata } from 'typescript'
import { IdentifiableReference, Reference } from '../reference'

interface Product {
    name: string
    desciption: string
    qty: number
}

// TODO: setup a way for the serialization type to pick up on the
// interface's props.
export const productConverter: FirestoreDataConverter<Product> = {
    toFirestore: function (modelObject: Product): Product {
        //NOTE: this can be any return type
        return {
            name: modelObject.name,
            desciption: modelObject.desciption,
            qty: modelObject.qty,
        }
    },
    fromFirestore: function (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Product {
        const data = snapshot.data(options)
        return {
            name: data.name,
            desciption: data.desciption,
            qty: data.qty,
        }
    },
}

type UpdateProductParams = Partial<Pick<Product, 'qty' | 'desciption' | 'name'>>

abstract class ProductModel<T = WithMetadata<Product>> {
    abstract createProduct(p: Product): Promise<IdentifiableReference<T>>
    abstract getProduct(id: string): Reference<T>
    abstract updateProduct(id: string, params: UpdateProductParams): Promise<void>
    abstract deleteProduct(id: string): Promise<void>
}

export class FirebaseProductModel implements ProductModel {
    private datamanager: FirebaseDataManager<Product>

    constructor(
        private readonly db: Firestore,
        converter: FirestoreDataConverter<Product>
    ) {
        this.datamanager = new FirebaseDataManager<Product>(db, 'products', converter)
    }

    createProduct(p: Product) {
        return this.datamanager.create(p)
    }

    getProduct(id: string) {
        return this.datamanager.getRef(id)
    }

    updateProduct(id: string, params: UpdateProductParams) {
        return this.datamanager.update(id, { ...params })
    }

    deleteProduct(id: string) {
        return this.datamanager.delete(id)
    }
}
