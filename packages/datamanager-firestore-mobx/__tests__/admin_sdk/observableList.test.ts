import { describe, expect, test } from '@jest/globals'
import { FirestoreNamespacedConverter } from '@js-state-reactivity-models/backend-firestore'
import { autorun } from 'mobx'
import { ObservableFirestoreList, ObservableFirestoreReference } from '../../lib'
import { FirebaseProductModel, productConverter } from '../product'
import { sleep } from '../utils'
import { initializeAdmin_SDK } from './initialize'

describe('Firebase tests', () => {
    const adminSdk = initializeAdmin_SDK()
    const productModel = new FirebaseProductModel(
        new FirestoreNamespacedConverter(adminSdk.db, adminSdk.fieldValue),
        productConverter,
        {
            readMode: 'realtime',
            Reference: ObservableFirestoreReference,
            List: ObservableFirestoreList,
        }
    )

    test('List initialization', async () => {
        const productList = productModel.getProductList()
        // it should not resolve, if just checking the value
        expect(productList.resolved).toEqual(false)
        await sleep(1000)
        expect(productList.resolved).toEqual(false)

        // it should not resolve - observed only for the duration of resolve() call
        const products = await productList.resolve()
        expect(products.length).toBeGreaterThan(0)
        expect(productList.resolved).toEqual(false)

        // if observed, it should resolve automatically
        const dispose = autorun(function () {
            return productList.resolved
        })

        await sleep(1000)
        expect(productList.values.length).toBeGreaterThan(0)
        expect(productList.resolved).toEqual(true)
        dispose()

        // unresolve on unobserve
        expect(productList.resolved).toEqual(false)

        // also resolve if observed for value
        const dispose2 = autorun(function () {
            return productList.values
        })

        await sleep(1000)
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
        await sleep(1000)

        expect(productList.values.length).toBeGreaterThan(originalLength)
        dispose()
    })
})
