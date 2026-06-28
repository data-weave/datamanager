import { Firestore, FirestoreReferenceError } from '@data-weave/backend-firestore'
import { FirebaseProductModel, productConverter } from '@test-fixtures/product'
import { getSDK } from '@test-fixtures/utils'
import assert from 'node:assert/strict'
import { before, beforeEach, describe, test } from 'node:test'
import { FirestoreListError, ObservableList } from '../src'

let sdk: Firestore

before(() => {
    sdk = getSDK()
})

let productModel: FirebaseProductModel
let restrictedProductModel: FirebaseProductModel
// This is a workaround to skip tests that are only relevant for the JS SDK
const jsOnlyTest = process.env.SDK_TYPE === 'ADMIN_SDK' ? test.skip : test

beforeEach(() => {
    productModel = new FirebaseProductModel(sdk, productConverter, {
        readMode: 'realtime',
        ListProxy: ObservableList,
    })

    restrictedProductModel = new FirebaseProductModel(
        sdk,
        productConverter,
        {
            readMode: 'realtime',
            ListProxy: ObservableList,
        },
        'private_products_on_error'
    )
})

describe('Firebase typed error tests', () => {
    test('should wrap error with FirestoreReferenceError and context for document reference', async () => {
        const ref = productModel.getProduct('non-existent-id')
        await ref.resolve()

        assert.equal(ref.hasError, true)
        assert.ok(ref.error instanceof FirestoreReferenceError)

        assert.equal(ref.error.context.type, 'reference')
        assert.ok(ref.error.context.path.includes('products'))
        assert.equal(ref.error.context.id, 'non-existent-id')
        assert.equal(ref.error.context.readMode, 'realtime')
        assert.ok(ref.error.cause instanceof Error)
    })

    test('should resolve without error for valid list reference', async () => {
        const list = productModel.getProductList()
        const values = await list.resolve()

        assert.ok(values)
        assert.equal(list.hasError, false)
    })

    jsOnlyTest('should wrap error with FirestoreListError for complex list query', async () => {
        const list = restrictedProductModel.getProductList({
            filters: [
                ['name', '==', 'test'],
                ['qty', '>', 0],
            ],
            orderBy: [['desciption', 'asc']],
        })
        assert.equal(list.hasError, false)
        await list.resolve()
        assert.equal(list.hasError, true)

        assert.ok(list.error instanceof FirestoreListError)
        assert.equal(list.error.context.type, 'list')
        assert.ok(list.error.context.query)
        assert.equal(list.error.context.readMode, 'realtime')
        assert.ok(list.error.cause instanceof Error)
    })

    jsOnlyTest('should wrap error with FirestoreListError for restricted query', async () => {
        const list = restrictedProductModel.getProductList({
            filters: [['__deleted', '==', true]],
        })

        assert.equal(list.hasError, false)
        await list.resolve()
        assert.equal(list.hasError, true)
        assert.ok(list.error instanceof FirestoreListError)

        assert.equal(list.error.context.type, 'list')
        assert.ok(list.error.context.query)
        assert.equal(list.error.context.readMode, 'realtime')
        assert.ok(list.error.cause instanceof Error)
    })
})
