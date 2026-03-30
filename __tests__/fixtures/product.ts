import {
    FirebaseDataManagerOptions,
    Firestore,
    FirestoreDataConverter,
    FirestoreDataManager,
    QueryParams,
    withTransaction,
} from '@data-weave/backend-firestore/src'
import { IdentifiableReference, Reference, WithMetadata } from '@data-weave/datamanager/src'
import { v4 as uuidv4 } from 'uuid'

interface Product {
    name: string
    desciption: string
    qty: number
}

// type SerializedProduct = Product & { temp: boolean }

// type test = WithTimestamps<Product>
// type test = Product

export const productConverter: FirestoreDataConverter<Product> = {
    toFirestore: function (modelObject) {
        return {
            name: modelObject.name,
            desciption: modelObject.desciption,
            qty: modelObject.qty,
        }
    },
    fromFirestore: function (snapshot, options): Product {
        const data = snapshot.data(options)
        return {
            name: data.name,
            desciption: data.desciption,
            qty: data.qty,
        }
    },
}

type UpdateProductParams = Partial<Pick<Product, 'qty' | 'desciption' | 'name'>>

abstract class ProductModel<T = Product, M = WithMetadata<T>> {
    abstract createProduct(p: T): Promise<IdentifiableReference<M>>
    abstract getProduct(id: string): Reference<T>
    abstract updateProduct(id: string, params: UpdateProductParams): Promise<void>
    abstract deleteProduct(id: string): Promise<void>
}

export class FirebaseProductModel implements ProductModel {
    private datamanager: FirestoreDataManager<Product>
    private collectionName: string

    constructor(
        readonly db: Firestore,
        readonly converter: FirestoreDataConverter<Product>,
        readonly options?: Partial<FirebaseDataManagerOptions>,
        collectionName?: string
    ) {
        this.collectionName = collectionName || `public_products_${uuidv4()}`
        this.datamanager = new FirestoreDataManager<Product>(db, this.collectionName, converter, options)
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

    countProducts(params?: QueryParams<Product>) {
        return this.datamanager.count(params)
    }

    sumQty(params?: QueryParams<Product>) {
        return this.datamanager.sum('qty', params)
    }

    averageQty(params?: QueryParams<Product>) {
        return this.datamanager.average('qty', params)
    }

    minQty(params?: QueryParams<Product>) {
        return this.datamanager.min('qty', params)
    }

    maxQty(params?: QueryParams<Product>) {
        return this.datamanager.max('qty', params)
    }

    updateStockTwiceWithTransaction(id: string, addQty: number) {
        return withTransaction(this.db, async transaction => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await this.datamanager.update(id, { qty: this.db.increment(addQty) }, { transaction: transaction as any })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await this.datamanager.update(id, { qty: this.db.increment(addQty) }, { transaction: transaction as any })
        })
    }

    updateStockWithTransactionWithError(id: string, addQty: number) {
        return withTransaction(this.db, async transaction => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await this.datamanager.update(id, { qty: this.db.increment(addQty) }, { transaction: transaction as any })
            throw new Error('Test transaction failure')
        })
    }
}
