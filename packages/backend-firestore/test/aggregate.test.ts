import { Firestore } from '@data-weave/backend-firestore'
import { FirebaseProductModel, productConverter } from '@test-fixtures/product'
import { getSDK } from '@test-fixtures/utils'
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

describe('sum', () => {
    test('sums qty across multiple products', async () => {
        await productModel.createProduct({ name: 'A', desciption: 'a', qty: 10 })
        await productModel.createProduct({ name: 'B', desciption: 'b', qty: 20 })
        await productModel.createProduct({ name: 'C', desciption: 'c', qty: 30 })

        const total = await productModel.sumQty()
        assert.equal(total, 60)
    })

    test('sums with filters', async () => {
        const tag = Math.floor(Math.random() * 1000 + 50000)
        await productModel.createProduct({ name: 'match', desciption: 'match', qty: tag })
        await productModel.createProduct({ name: 'match', desciption: 'match', qty: tag })
        await productModel.createProduct({ name: 'other', desciption: 'other', qty: 1 })

        const total = await productModel.sumQty({ filters: [['name', '==', 'match']] })
        assert.equal(total, tag * 2)
    })

    test('returns 0 on empty collection', async () => {
        const total = await productModel.sumQty()
        assert.equal(total, 0)
    })
})

describe('count', () => {
    test('counts all products', async () => {
        await productModel.createProduct({ name: 'A', desciption: 'a', qty: 1 })
        await productModel.createProduct({ name: 'B', desciption: 'b', qty: 2 })
        await productModel.createProduct({ name: 'C', desciption: 'c', qty: 3 })

        const total = await productModel.countProducts()
        assert.equal(total, 3)
    })

    test('counts with filters', async () => {
        await productModel.createProduct({ name: 'widget', desciption: 'w', qty: 10 })
        await productModel.createProduct({ name: 'widget', desciption: 'w', qty: 30 })
        await productModel.createProduct({ name: 'gadget', desciption: 'g', qty: 100 })

        const total = await productModel.countProducts({ filters: [['name', '==', 'widget']] })
        assert.equal(total, 2)
    })

    test('counts with greater than filter', async () => {
        await productModel.createProduct({ name: 'A', desciption: 'a', qty: 5 })
        await productModel.createProduct({ name: 'B', desciption: 'b', qty: 15 })
        await productModel.createProduct({ name: 'C', desciption: 'c', qty: 25 })
        await productModel.createProduct({ name: 'D', desciption: 'd', qty: 35 })

        const total = await productModel.countProducts({ filters: [['qty', '>', 10]] })
        assert.equal(total, 3)
    })

    test('returns 0 on empty collection', async () => {
        const total = await productModel.countProducts()
        assert.equal(total, 0)
    })
})

describe('average', () => {
    test('averages qty across multiple products', async () => {
        await productModel.createProduct({ name: 'A', desciption: 'a', qty: 10 })
        await productModel.createProduct({ name: 'B', desciption: 'b', qty: 20 })
        await productModel.createProduct({ name: 'C', desciption: 'c', qty: 30 })

        const avg = await productModel.averageQty()
        assert.equal(avg, 20)
    })

    test('returns null on empty collection', async () => {
        const avg = await productModel.averageQty()
        assert.equal(avg, null)
    })
})

describe('min', () => {
    test('finds minimum qty', async () => {
        await productModel.createProduct({ name: 'A', desciption: 'a', qty: 5 })
        await productModel.createProduct({ name: 'B', desciption: 'b', qty: 50 })
        await productModel.createProduct({ name: 'C', desciption: 'c', qty: 25 })

        const result = await productModel.minQty()
        assert.equal(result, 5)
    })

    test('returns null on empty collection', async () => {
        const result = await productModel.minQty()
        assert.equal(result, null)
    })
})

describe('max', () => {
    test('finds maximum qty', async () => {
        await productModel.createProduct({ name: 'A', desciption: 'a', qty: 5 })
        await productModel.createProduct({ name: 'B', desciption: 'b', qty: 50 })
        await productModel.createProduct({ name: 'C', desciption: 'c', qty: 25 })

        const result = await productModel.maxQty()
        assert.equal(result, 50)
    })

    test('returns null on empty collection', async () => {
        const result = await productModel.maxQty()
        assert.equal(result, null)
    })
})
