import { describe, test, expect } from '@jest/globals'
import { firestore, apps } from 'firebase-admin'
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { FirebaseProductModel, productConverter } from './product'
import { sleep } from './utils'
import { autorun } from 'mobx'
import { ObservableFirestoreRefence } from '../ObservableFirestoreReference'

let productModel: FirebaseProductModel

beforeAll(() => {
    if (apps.length === 0) {
        initializeApp({
            credential: applicationDefault(),
        })
    }

    const db = firestore()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    productModel = new FirebaseProductModel(db as any, firestore.FieldValue, productConverter, {
        readMode: 'realtime',
        ReferenceClass: ObservableFirestoreRefence,
    })
})

describe('Firebase tests', () => {
    test('Reference initialization', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        // it should not resolve, if just checking the value
        expect(productRef.resolved).toEqual(false)
        await sleep(1000)
        expect(productRef.resolved).toEqual(false)

        // it should not resolve - observed only for the duration of resolve() call
        const product = await productRef.resolve()
        expect(product?.name).toEqual('test')
        expect(productRef.resolved).toEqual(false)

        // if observed, it should resolve automatically
        const dispose = autorun(function () {
            return productRef.resolved
        })

        await sleep(1000)
        expect(productRef.resolved).toEqual(true)
        dispose()

        // unresolve on unobserve
        expect(productRef.resolved).toEqual(false)

        // also resolve if observed for value
        const dispose2 = autorun(function () {
            return productRef.value
        })

        await sleep(1000)
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
        await sleep(1000)
        expect(productRef.value?.qty).toEqual(1)

        await productModel.updateProduct(productRef.id, { qty: 2 })
        await sleep(1000)

        expect(productRef.value?.qty).toEqual(2)
        dispose()
    })
})
