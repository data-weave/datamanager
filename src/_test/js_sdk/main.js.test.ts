import { describe, test, expect } from '@jest/globals'
import { sleep } from '../utils'
import { initializeJS_SDK } from './intitialize'
import { FirebaseProductModel, productConverter } from '../product'

describe('Firebase tests', () => {
    const productModel = new FirebaseProductModel(initializeJS_SDK(), productConverter)

    test('Product creation', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        const product = await productRef.resolve()

        expect(product?.name).toEqual('test')
        expect(product?.desciption).toEqual('test')
        expect(product?.qty).toEqual(1)
    })

    test('Product updates', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        const product = await productRef.resolve()

        await sleep(500)

        await productModel.updateProduct(productRef.id, { qty: 2 })
        const productAfterUpdate = await productRef.resolve()

        expect(productAfterUpdate?.name).toEqual('test')
        expect(productAfterUpdate?.desciption).toEqual('test')
        expect(productAfterUpdate?.qty).toEqual(2)
        expect(productAfterUpdate?.createdAt).toEqual(product?.createdAt)
        expect(productAfterUpdate?.updatedAt).not.toEqual(product?.updatedAt)
    })

    test('Product delete soft', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        console.log(productRef.id)
        await sleep(500)
        await productModel.deleteProduct(productRef.id)

        const product = await productRef.resolve()
        expect(product?.deleted).toEqual(true)
    })

    test('Product delete hard', async () => {
        const productModelHardDelete = new FirebaseProductModel(initializeJS_SDK(), productConverter, {
            deleteMode: 'hard',
        })

        const productRef = await productModelHardDelete.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(200)
        const productBeforeDelete = await productRef.resolve()
        expect(productBeforeDelete).not.toBeUndefined()

        await productModelHardDelete.deleteProduct(productRef.id)

        // expect error
        await expect(productRef.resolve()).rejects.toThrow()
    })

    test('Product query', async () => {
        const qty = Math.floor(Math.random() * 1000000)
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })

        const listRef = productModel.getProductList({ filters: [['qty', '==', qty]] })
        await listRef.resolve()

        expect(listRef.values.length).toEqual(1)
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })

        await listRef.resolve()
        expect(listRef.values.length).toEqual(3)
    })
})
