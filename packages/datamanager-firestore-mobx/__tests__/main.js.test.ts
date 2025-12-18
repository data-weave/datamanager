import { FirestoreAdminAdapter } from '@data-weave/backend-firestore-admin'
import { Firestore } from '@data-weave/backend-firestore/src'
import { initializeAdmin_SDK, initializeJS_SDK } from './intitialize'
import { FirebaseProductModel, productConverter } from './product'
import { sleep } from './utils'

export let sdk: Firestore

beforeAll(() => {
    const sdkType = process.env.SDK_TYPE || 'JS_SDK'

    if (sdkType === 'ADMIN_SDK') {
        const adminSdk = initializeAdmin_SDK()
        // @ts-expect-error - TODO: fix this
        sdk = new FirestoreAdminAdapter(adminSdk.db, adminSdk.fieldValue) as Firestore
    } else {
        sdk = initializeJS_SDK()
    }
})

let productModel: FirebaseProductModel

beforeEach(() => {
    productModel = new FirebaseProductModel(sdk, { readMode: 'static', converter: productConverter })
})

describe('Firebase static tests', () => {
    test('Product creation', async () => {
        const productRef = await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty: 1,
            date: new Date(),
            nested: { field1: 'test', deep: { field2: 'test' } },
            nestedOptional: {
                field1: 'test',
                deepOptional: null,
            },
        })
        const product = await productRef.resolve()

        expect(product?.name).toEqual('test')
        expect(product?.desciption).toEqual('test')
        expect(product?.qty).toEqual(1)
    })

    test('Product updates', async () => {
        const productRef = await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty: 1,
            date: new Date(),
            nested: { field1: 'test', deep: { field2: 'test' } },
            nestedOptional: null,
        })
        const product = await productRef.resolve()

        await sleep(500)

        await productModel.updateProduct(productRef.id, { qty: 2 })
        const productAfterUpdate = await productRef.resolve()

        expect(productAfterUpdate?.name).toEqual('test')
        expect(productAfterUpdate?.desciption).toEqual('test')
        expect(productAfterUpdate?.qty).toEqual(2)
        expect(productAfterUpdate?.createdAt).toEqual(product?.createdAt)
        expect(productAfterUpdate?.updatedAt).not.toEqual(product?.updatedAt)
    })

    test('Product delete soft', async () => {
        const productRef = await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty: 1,
            date: new Date(),
            nested: { field1: 'test', deep: { field2: 'test' } },
            nestedOptional: null,
        })
        await sleep(500)
        await productModel.deleteProduct(productRef.id)

        const product = await productRef.resolve()
        expect(product?.deleted).toEqual(true)
    })

    test('Product delete hard', async () => {
        const productModelHardDelete = new FirebaseProductModel(sdk, {
            deleteMode: 'hard',
            readMode: 'static',
        })

        const productRef = await productModelHardDelete.createProduct({
            name: 'test',
            desciption: 'test',
            qty: 1,
            date: new Date(),
            nested: { field1: 'test', deep: { field2: 'test' } },
            nestedOptional: null,
        })
        await sleep(500)
        const productBeforeDelete = await productRef.resolve()
        expect(productBeforeDelete).not.toBeUndefined()

        await productModelHardDelete.deleteProduct(productRef.id)

        // expect error
        await expect(productRef.resolve()).rejects.toThrow(/Document does not exist.*$/)
    })

    test('Product query', async () => {
        const qty = Math.floor(Math.random() * 1000 + 10000)
        await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty,
            date: new Date(),
            nested: { field1: 'test', deep: { field2: 'test' } },
            nestedOptional: null,
        })

        const listRef = productModel.getProductList({ filters: [['qty', '==', qty]] })
        await listRef.resolve()

        expect(listRef.values.length).toEqual(1)
        await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty,
            date: new Date(),
            nested: { field1: 'test', deep: { field2: 'test' } },
            nestedOptional: null,
        })
        await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty,
            date: new Date(),
            nested: { field1: 'test', deep: { field2: 'test' } },
            nestedOptional: null,
        })

        await listRef.resolve()
        expect(listRef.values.length).toEqual(3)
    })

    test('Product transaction static', async () => {
        const productRef = await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty: 1,
            date: new Date(),
            nested: { field1: 'test', deep: { field2: 'test' } },
            nestedOptional: null,
        })
        await sleep(500)
        await productModel.updateStockTwiceWithTransaction(productRef.id, 10)
        await productRef.resolve()
        await sleep(500)
        expect(productRef.value?.qty).toEqual(21)
    })

    test('Product transaction on failed transaction', async () => {
        const productRef = await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty: 1,
            date: new Date(),
            nested: { field1: 'test', deep: { field2: 'test' } },
            nestedOptional: null,
        })
        await sleep(500)
        await expect(productModel.updateStockWithTransactionWithError(productRef.id, 10)).rejects.toThrow()
        await productRef.resolve()
        await sleep(500)
        expect(productRef.value?.qty).toEqual(1)
    })
})
