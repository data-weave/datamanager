import { describe, test, expect } from '@jest/globals'
import { FirebaseProductModel, productConverter } from '../product'
import { sleep } from '../utils'
import { autorun } from 'mobx'
import { ObservableFirestoreReference } from '../../ObservableFirestoreReference'
import { initializeJS_SDK } from './intitialize'

describe('Firebase tests', () => {
    const productModel = new FirebaseProductModel(initializeJS_SDK(), productConverter, {
        readMode: 'realtime',
        ReferenceClass: ObservableFirestoreReference,
    })

    test('Reference initialization', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        // it should not resolve, if just checking the value
        expect(productRef.resolved).toEqual(false)
        await sleep(500)
        expect(productRef.resolved).toEqual(false)

        // it should not resolve - observed only for the duration of resolve() call
        const product = await productRef.resolve()
        expect(product?.name).toEqual('test')
        expect(productRef.resolved).toEqual(false)

        // if observed, it should resolve automatically
        const dispose = autorun(function () {
            return productRef.resolved
        })

        await sleep(500)
        expect(productRef.resolved).toEqual(true)
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
        // value should remain
        expect(productRef.value).toEqual(product)
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
