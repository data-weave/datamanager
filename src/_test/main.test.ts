import { describe, test, expect } from '@jest/globals'
import admin, { firestore, apps } from 'firebase-admin'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { FirebaseProductModel, productConverter } from './product'
import { sleep } from './utils'
import { FirestoreNamespaced } from '../FirestoreTypes'

let productModel: FirebaseProductModel

beforeAll(() => {
    if (apps.length === 0) {
        initializeApp({
            credential: applicationDefault(),
        })
    }

    const db = firestore()
    db.settings({ ignoreUndefinedProperties: true })

    productModel = new FirebaseProductModel(new FirestoreNamespaced(db, admin.firestore.FieldValue), productConverter)
})

describe('Firebase tests', () => {
    test('Product creation', async () => {
        const productRef = await productModel!.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        const product = await productRef.resolve()

        expect(product?.name).toEqual('test')
        expect(product?.desciption).toEqual('test')
        expect(product?.qty).toEqual(1)
    })

    test('Product updates', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        const product = await productRef.resolve()

        await productModel.updateProduct(productRef.id, { qty: 2 })
        const productAfterUpdate = await productRef.resolve()

        expect(productAfterUpdate?.name).toEqual('test')
        expect(productAfterUpdate?.desciption).toEqual('test')
        expect(productAfterUpdate?.qty).toEqual(2)
        expect(productAfterUpdate?.createdAt).toEqual(product?.createdAt)
        expect(productAfterUpdate?.updatedAt).not.toEqual(product?.updatedAt)
    })

    test('Product delete', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })

        await sleep(1000)
        await productModel.deleteProduct(productRef.id)

        const product = await productRef.resolve()
        expect(product?.deleted).toEqual(true)
    })

    test('Product query', async () => {
        await productModel.createProduct({ name: 'test', desciption: 'test', qty: 55 })

        const listRef = productModel.getProductList({ filters: [['qty', '==', 55]] })
        await listRef.resolve()

        expect(listRef.values.length).toEqual(1)
        await productModel.createProduct({ name: 'test', desciption: 'test', qty: 55 })
        await productModel.createProduct({ name: 'test', desciption: 'test', qty: 55 })

        await listRef.resolve()
        expect(listRef.values.length).toEqual(3)
    })
})
