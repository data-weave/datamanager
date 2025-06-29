import {
    FirebaseDataManagerOptions,
    Firestore,
    FirestoreDataConverter,
    FirestoreDataManager,
    QueryParams,
    withTransaction,
} from '@js-state-reactivity-models/backend-firestore'
import { IdentifiableReference, Reference, WithMetadata } from '@js-state-reactivity-models/datamanager'
import { v4 as uuidv4 } from 'uuid'

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
        this.datamanager = new FirestoreDataManager<Product, SerializedProduct>(
            db,
            `products_${uuidv4()}`,
            converter,
            options
        )
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

    async updateStockWithTransaction(id: string, addQty: number) {
        console.log('path', `${this.datamanager.collectionPath}/${id}`)

        await withTransaction(this.db, async transaction => {
            const product = await this.datamanager.read(id, { transaction: transaction as any })
            if (!product) throw new Error('Product not found')
            product.qty += addQty
            await this.datamanager.update(id, { qty: product.qty }, { transaction: transaction as any })
            console.log('updated in transaction')
        })

        // const product = await this.datamanager.read(id)
        // console.log('product', product)
        // return
    }

    updateStockWithTransactionWithError(id: string, addQty: number) {
        return withTransaction(this.db, async transaction => {
            const product = await this.datamanager.read(id, { transaction: transaction as any })
            if (!product) throw new Error('Product not found')
            product.qty += addQty
            await this.datamanager.update(id, { qty: product.qty }, { transaction: transaction as any })
            throw new Error('Test transaction failure')
        })
    }
}
