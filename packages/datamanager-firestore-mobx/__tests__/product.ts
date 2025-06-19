import {
    FirebaseDataManagerOptions,
    Firestore,
    FirestoreDataConverter,
    FirestoreDataManager,
    QueryParams,
} from '@js-state-reactivity-models/backend-firestore'
import { IdentifiableReference, Reference, WithMetadata } from '@js-state-reactivity-models/datamanager'

interface Product {
    name: string
    desciption: string
    qty: number
}

type SerializedProduct = Product

export const productConverter: FirestoreDataConverter<Product, SerializedProduct> = {
    toFirestore: function (modelObject: Product) {
        return {
            name: modelObject.name,
            desciption: modelObject.desciption,
            qty: modelObject.qty,
        }
    },
    fromFirestore: function (snapshot, options) {
        const data = snapshot.data(options) as SerializedProduct
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
    private datamanager: FirestoreDataManager<Product, SerializedProduct>

    constructor(
        readonly db: Firestore,
        readonly converter: FirestoreDataConverter<Product, SerializedProduct>,
        readonly options?: FirebaseDataManagerOptions
    ) {
        this.datamanager = new FirestoreDataManager<Product, SerializedProduct>(db, 'products', converter, options)
    }

    createProduct(p: Product) {
        return this.datamanager.create(p)
    }

    getProduct(id: string) {
        return this.datamanager.getRef(id)
    }

    getProductList(params?: QueryParams<Product>) {
        return this.datamanager.getList(params)
    }

    updateProduct(id: string, params: UpdateProductParams) {
        return this.datamanager.update(id, params)
    }

    deleteProduct(id: string) {
        return this.datamanager.delete(id)
    }
}
