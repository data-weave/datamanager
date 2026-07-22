import { Firestore } from '@data-weave/backend-firestore'
import { FirebaseProductModel, productConverter } from '@test-fixtures/product'
import { getSDK, sleep } from '@test-fixtures/utils'
import { autorun } from 'mobx'
import assert from 'node:assert/strict'
import { before, beforeEach, describe, test } from 'node:test'
import { ObservableReference } from '../src'

let sdk: Firestore

before(() => {
    sdk = getSDK()
})

let productModel: FirebaseProductModel

beforeEach(() => {
    productModel = new FirebaseProductModel(sdk, productConverter, {
        readMode: 'realtime',
        ReferenceProxy: ObservableReference,
    })
})

describe('Firebase observable reference tests', () => {
    test('Reference initialization', async () => {
        const productRef = await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty: 1,
            data: { a: 1 },
        })
        // it should not resolve, if just checking the value
        assert.equal(productRef.resolved, false)
        await sleep(500)
        assert.equal(productRef.resolved, false)

        // if observed, it should resolve automatically
        const dispose = autorun(function () {
            return productRef.resolved
        })

        await sleep(500)
        assert.equal(productRef.resolved, true)
        assert.equal(productRef.value?.name, 'test')
        dispose()

        // unresolve on unobserve
        assert.equal(productRef.resolved, false)

        // also resolve if observed for value
        const dispose2 = autorun(function () {
            return productRef.value
        })

        await sleep(500)
        assert.equal(productRef.resolved, true)
        dispose2()

        // unresolve on unobserve
        assert.equal(productRef.resolved, false)
    })

    test('Reference realtime updates', async () => {
        const productRef = await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty: 1,
            data: { a: 1 },
        })

        const dispose = autorun(function () {
            return productRef.value
        })
        await sleep(500)
        assert.equal(productRef.value?.qty, 1)

        await productModel.updateProduct(productRef.id, { qty: 2 })
        await sleep(500)

        assert.equal(productRef.value?.qty, 2)
        dispose()
    })

    test('Product transaction', async () => {
        const productRef = await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty: 1,
            data: { a: 1 },
        })
        await sleep(500)
        await productModel.updateStockTwiceWithTransaction(productRef.id, 10)
        await productRef.resolve()
        await sleep(500)
        assert.equal(productRef.value?.qty, 21)
    })

    test('Product transaction with realtime updates', async () => {
        const productRef = await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty: 1,
            data: { a: 1 },
        })
        const dispose = autorun(function () {
            return productRef.value
        })
        await sleep(500)
        assert.equal(productRef.value?.qty, 1)

        await productModel.updateStockTwiceWithTransaction(productRef.id, 10)
        await sleep(500)
        assert.equal(productRef.value?.qty, 21)
        dispose()
    })

    test('Product transaction on failed transaction', async () => {
        const productRef = await productModel.createProduct({
            name: 'test',
            desciption: 'test',
            qty: 1,
            data: { a: 1 },
        })
        await sleep(500)
        await assert.rejects(productModel.updateStockWithTransactionWithError(productRef.id, 10))
        await productRef.resolve()
        await sleep(500)
        assert.equal(productRef.value?.qty, 1)
    })
})
