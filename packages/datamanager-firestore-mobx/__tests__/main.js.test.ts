import { describe, expect, test } from '@jest/globals'
import {
    Firestore,
    FirestoreNamespacedConverter,
    FirestoreReference,
} from '@js-state-reactivity-models/backend-firestore'
import { autorun } from 'mobx'
import { initializeAdmin_SDK, initializeJS_SDK } from './intitialize'
import { FirebaseProductModel, productConverter } from './product'
import { sleep } from './utils'

export let sdk: Firestore

jest.retryTimes(0)

beforeAll(() => {
    const sdkType = process.env.SDK_TYPE || 'JS_SDK'
    console.debug(`Running tests with ${sdkType}`)

    if (sdkType === 'ADMIN_SDK') {
        const adminSdk = initializeAdmin_SDK()
        sdk = new FirestoreNamespacedConverter(adminSdk.db, adminSdk.fieldValue)
    } else {
        sdk = initializeJS_SDK()
    }
})

let productModel: FirebaseProductModel

beforeEach(() => {
    productModel = new FirebaseProductModel(sdk, productConverter, {
        readMode: 'static',
        Reference: FirestoreReference,
    })
})

describe('Firebase tests', () => {
    test('Product creation', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        const product = await productRef.resolve()

        expect(product?.name).toEqual('test')
        expect(product?.desciption).toEqual('test')
        expect(product?.qty).toEqual(1)
    })

    test('Product updates', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
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

    // test('Product delete soft', async () => {
    //     const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
    //     await sleep(500)
    //     await productModel.deleteProduct(productRef.id)

    //     const product = await productRef.resolve()
    //     expect(product?.deleted).toEqual(true)
    // })

    // test('Product delete hard', async () => {
    //     const productModelHardDelete = new FirebaseProductModel(sdk, productConverter, {
    //         deleteMode: 'hard',
    //         readMode: 'realtime',
    //         // TODO: test multiple references
    //         Reference: ObservableFirestoreReference,
    //     })

    //     const productRef = await productModelHardDelete.createProduct({ name: 'test', desciption: 'test', qty: 1 })

    //     await sleep(500)
    //     const productBeforeDelete = await productRef.resolve()
    //     expect(productBeforeDelete).not.toBeUndefined()

    //     await productModelHardDelete.deleteProduct(productRef.id)

    //     await expect(productRef.resolve()).rejects.toThrow(/Document does not exist/)
    // })

    test('Product query', async () => {
        const qty = Math.floor(Math.random() * 1000000)
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })

        const listRef = productModel.getProductList({ filters: [['qty', '==', qty]] })
        await listRef.resolve()

        expect(listRef.values.length).toEqual(1)
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })

        await listRef.resolve()
        expect(listRef.values.length).toEqual(3)
    })

    test('Product transaction', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(500)

        const dispose = autorun(function () {
            return productRef.resolved
        })

        await productModel.updateStockWithTransaction(productRef.id, 10)

        console.log('productRef.id', productRef.id)
        await sleep(2500)

        let productAfterUpdate = await productRef.resolve()
        productAfterUpdate = await productRef.resolve()
        productAfterUpdate = await productRef.resolve()
        await sleep(2500)
        expect(productAfterUpdate?.qty).toEqual(11)
        dispose()
    }, 250000)

    test('Product transaction on failed transaction', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(500)
        await expect(productModel.updateStockWithTransactionWithError(productRef.id, 10)).rejects.toThrow()
        const productAfterUpdate = await productRef.resolve()
        await sleep(500)
        expect(productAfterUpdate?.qty).toEqual(1)
    })

    test('List multiple updates at once', async () => {})
})
