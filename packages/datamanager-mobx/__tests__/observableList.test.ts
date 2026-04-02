import { Firestore } from '@data-weave/backend-firestore'
import { describe, test } from '@jest/globals'
import { FirebaseProductModel, productConverter } from '@test-fixtures/product'
import { getSDK, sleep } from '@test-fixtures/utils'
import { autorun } from 'mobx'
import { ObservableList } from '../src'

let sdk: Firestore

beforeAll(() => {
    sdk = getSDK()
})

let productModel: FirebaseProductModel

beforeEach(() => {
    productModel = new FirebaseProductModel(sdk, productConverter, {
        readMode: 'realtime',
        ListWrapper: ObservableList,
    })
})

describe('Firebase observable list tests', () => {
    test('do nothing', () => {
        expect(true).toEqual(true)
    })

    test('List initialization', async () => {
        await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        const productList = productModel.getProductList()
        // it should not resolve by itself
        expect(productList.resolved).toEqual(false)
        await sleep(500)
        expect(productList.resolved).toEqual(false)

        const products = await productList.resolve()
        expect(products.length).toBeGreaterThan(0)

        // if observed, it should resolve automatically
        const dispose = autorun(function () {
            return productList.resolved
        })

        await sleep(500)
        expect(productList.values.length).toBeGreaterThan(0)
        expect(productList.resolved).toEqual(true)
        dispose()

        // unresolve on unobserve
        expect(productList.resolved).toEqual(false)

        // also resolve if observed for value
        const dispose2 = autorun(function () {
            return productList.values
        })

        await sleep(500)
        expect(productList.values.length).toBeGreaterThan(0)
        expect(productList.resolved).toEqual(true)
        dispose2()

        // unresolve on unobserve
        expect(productList.resolved).toEqual(false)
        // value should remain
        expect(productList.values).toEqual(products)
    })

    test('List realtime updates', async () => {
        const productList = productModel.getProductList()
        const products = await productList.resolve()
        const originalLength = products.length
        expect(productList.values.length).toEqual(products.length)

        const dispose = autorun(function () {
            return productList.values
        })

        await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(500)

        expect(productList.values.length).toBeGreaterThan(originalLength)
        dispose()
    })
})
