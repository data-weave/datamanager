import { Firestore } from '@data-weave/backend-firestore'
import { FirebaseProductModel, productConverter } from '@test-fixtures/product'
import { getSDK, sleep } from '@test-fixtures/utils'
import { autorun } from 'mobx'
import assert from 'node:assert/strict'
import { before, beforeEach, describe, test } from 'node:test'
import { ObservableList } from '../src'

let sdk: Firestore

before(() => {
    sdk = getSDK()
})

let productModel: FirebaseProductModel

beforeEach(() => {
    productModel = new FirebaseProductModel(sdk, productConverter, {
        readMode: 'realtime',
        ListProxy: ObservableList,
    })
})

describe('Firebase observable list tests', () => {
    test('do nothing', () => {
        assert.ok(true)
    })

    test('List initialization', async () => {
        await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        const productList = productModel.getProductList()
        // it should not resolve by itself
        assert.equal(productList.resolved, false)
        await sleep(500)
        assert.equal(productList.resolved, false)

        const products = await productList.resolve()
        assert.ok(products.length > 0)

        // if observed, it should resolve automatically
        const dispose = autorun(function () {
            return productList.resolved
        })

        await sleep(500)
        assert.ok(productList.values.length > 0)
        assert.equal(productList.resolved, true)
        dispose()

        // unresolve on unobserve
        assert.equal(productList.resolved, false)

        // also resolve if observed for value
        const dispose2 = autorun(function () {
            return productList.values
        })

        await sleep(500)
        assert.ok(productList.values.length > 0)
        assert.equal(productList.resolved, true)
        dispose2()

        // unresolve on unobserve
        assert.equal(productList.resolved, false)
        // value should remain
        assert.deepEqual(productList.values, products)
    })

    test('List realtime updates', async () => {
        const productList = productModel.getProductList()
        const products = await productList.resolve()
        const originalLength = products.length
        assert.equal(productList.values.length, products.length)

        const dispose = autorun(function () {
            return productList.values
        })

        await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(500)

        assert.ok(productList.values.length > originalLength)
        dispose()
    })
})
