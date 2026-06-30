import { Firestore, FirestoreReferenceError } from '@data-weave/backend-firestore'
import { FirebaseProductModel, productConverter } from '@test-fixtures/product'
import { getSDK, sleep } from '@test-fixtures/utils'
import assert from 'node:assert/strict'
import { before, beforeEach, describe, test } from 'node:test'

let sdk: Firestore

before(() => {
    sdk = getSDK()
})

let productModel: FirebaseProductModel

beforeEach(() => {
    productModel = new FirebaseProductModel(sdk, productConverter, { readMode: 'static' })
})

describe('Firebase static tests', () => {
    test('Product creation', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        const product = await productRef.resolve()

        assert.equal(product?.name, 'test')
        assert.equal(product?.desciption, 'test')
        assert.equal(product?.qty, 1)
    })

    test('Product updates', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        const product = await productRef.resolve()

        await sleep(500)

        await productModel.updateProduct(productRef.id, { qty: 2 })
        const productAfterUpdate = await productRef.resolve()

        assert.equal(productAfterUpdate?.name, 'test')
        assert.equal(productAfterUpdate?.desciption, 'test')
        assert.equal(productAfterUpdate?.qty, 2)
        assert.deepEqual(productAfterUpdate?.createdAt, product?.createdAt)
        assert.notDeepEqual(productAfterUpdate?.updatedAt, product?.updatedAt)
    })

    test('Product delete soft is not fetchable by reference', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(500)
        await productModel.deleteProduct(productRef.id)

        const product = await productRef.resolve()
        assert.equal(product, undefined)
    })

    test('Product delete soft is not fetchable via read', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(500)
        await productModel.deleteProduct(productRef.id)

        const product = await productModel.readProduct(productRef.id)
        assert.equal(product, undefined)
    })

    test('Product delete soft is excluded from list', async () => {
        const qty = Math.floor(Math.random() * 1000 + 20000)
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty })
        await sleep(500)
        await productModel.deleteProduct(productRef.id)

        const listRef = productModel.getProductList({ filters: [['qty', '==', qty]] })
        await listRef.resolve()
        assert.equal(listRef.values.length, 0)
    })

    test('Product delete hard', async () => {
        const productModelHardDelete = new FirebaseProductModel(sdk, productConverter, {
            deleteMode: 'hard',
            readMode: 'static',
        })

        const productRef = await productModelHardDelete.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(1000)
        const productBeforeDelete = await productRef.resolve()
        assert.notEqual(productBeforeDelete, undefined)

        await productModelHardDelete.deleteProduct(productRef.id)

        await productRef.resolve()
        assert.equal(productRef.hasError, true)
        assert.ok(productRef.error instanceof FirestoreReferenceError)
        assert.ok(productRef.error.cause instanceof Error)
        assert.match(productRef.error.cause.message, /Document does not exist/)
    })

    test('Product query', async () => {
        const qty = Math.floor(Math.random() * 1000 + 10000)
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })

        const listRef = productModel.getProductList({ filters: [['qty', '==', qty]] })
        await listRef.resolve()

        assert.equal(listRef.values.length, 1)
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })

        await listRef.resolve()
        assert.equal(listRef.values.length, 3)
    })

    test('Product transaction static', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(500)
        await productModel.updateStockTwiceWithTransaction(productRef.id, 10)
        await productRef.resolve()
        await sleep(500)
        assert.equal(productRef.value?.qty, 21)
    })

    test('Product transaction on failed transaction', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(500)
        await assert.rejects(productModel.updateStockWithTransactionWithError(productRef.id, 10))
        await productRef.resolve()
        await sleep(500)
        assert.equal(productRef.value?.qty, 1)
    })
})
