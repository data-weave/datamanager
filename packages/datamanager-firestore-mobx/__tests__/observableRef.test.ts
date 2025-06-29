import { describe, expect, test } from '@jest/globals'
import { autorun } from 'mobx'

import { ObservableFirestoreReference } from '../lib'
import { sdk } from './main.js.test'
import { FirebaseProductModel, productConverter } from './product'
import { sleep } from './utils'

let productModel: FirebaseProductModel

beforeEach(() => {
    productModel = new FirebaseProductModel(sdk, productConverter, {
        readMode: 'realtime',
        Reference: ObservableFirestoreReference,
    })
})

describe('Firebase tests', () => {
    test('Reference initialization', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        // it should not resolve, if just checking the value
        expect(productRef.resolved).toEqual(false)
        await sleep(500)
        expect(productRef.resolved).toEqual(false)

        // if observed, it should resolve automatically
        const dispose = autorun(function () {
            return productRef.resolved
        })

        await sleep(500)
        expect(productRef.resolved).toEqual(true)
        expect(productRef.value?.name).toEqual('test')
        dispose()

        // unresolve on unobserve
        expect(productRef.resolved).toEqual(false)

        // also resolve if observed for value
        const dispose2 = autorun(function () {
            return productRef.value
        })

        await sleep(500)
        expect(productRef.resolved).toEqual(true)
        dispose2()

        // unresolve on unobserve
        expect(productRef.resolved).toEqual(false)
    })

    test('Reference realtime updates', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        const dispose = autorun(function () {
            return productRef.value
        })
        await sleep(500)
        expect(productRef.value?.qty).toEqual(1)

        await productModel.updateProduct(productRef.id, { qty: 2 })
        await sleep(500)

        expect(productRef.value?.qty).toEqual(2)
        dispose()
    })
})
