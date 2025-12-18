import {
    FirebaseDataManagerOptions,
    Firestore,
    FirestoreDataConverter,
    FirestoreDataManager,
    QueryParams,
    withTransaction,
} from '@data-weave/backend-firestore/src'
import { CreateData } from '@data-weave/datamanager'
import { IdentifiableReference, Reference, WithMetadata } from '@data-weave/datamanager/src'
import { v4 as uuidv4 } from 'uuid'

interface Product {
    name: string
    desciption: string
    qty?: number
    nested: {
        field1: string
        deep: {
            field2: string
        }
    }
    nestedOptional?: {
        field1: string
        deepOptional?: {
            fieldOptional?: string
        }
    }
    date: Date
}

export const productConverter: FirestoreDataConverter<Product> = {
    toFirestore: function (modelObject) {
        return {
            name: modelObject.name,
            desciption: modelObject.desciption,
            qty: modelObject.qty,
            'nested.name': modelObject.nested?.field1,
            'nested.deep.field2': modelObject.nested?.deep?.field2,
        }
    },
    fromFirestore: function (snapshot, options) {
        const data = snapshot.data(options)
        return {
            name: data.name,
            desciption: data.desciption,
            qty: data.qty,
            date: data.date.toDate(),
            nested: data.nested,
        }
    },
}

type UpdateProductParams = Partial<Pick<Product, 'qty' | 'desciption' | 'name'>>

abstract class ProductModel<T = Product, M = WithMetadata<T>> {
    abstract createProduct(p: CreateData<T>): Promise<IdentifiableReference<M>>
    abstract getProduct(id: string): Reference<T>
    abstract updateProduct(id: string, params: UpdateProductParams): Promise<void>
    abstract deleteProduct(id: string): Promise<void>
}

export class FirebaseProductModel implements ProductModel {
    private datamanager: FirestoreDataManager<Product>
    private collectionName = `products_${uuidv4()}`

    constructor(
        private readonly db: Firestore,
        options?: FirebaseDataManagerOptions<Product, Product>
    ) {
        this.datamanager = new FirestoreDataManager<Product, Product>(db, this.collectionName, options)
    }

    createProduct(p: CreateData<Product>) {
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
