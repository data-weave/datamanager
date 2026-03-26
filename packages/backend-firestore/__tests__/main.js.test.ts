import { Firestore } from '@data-weave/backend-firestore/src'
import { FirebaseProductModel, productConverter } from '@test-fixtures/product'
import { getSDK, sleep } from '@test-fixtures/utils'

let sdk: Firestore

beforeAll(() => {
    sdk = getSDK()
})

let productModel: FirebaseProductModel

beforeEach(() => {
    productModel = new FirebaseProductModel(sdk, productConverter, { readMode: 'static' })
})

describe('Firebase static tests', () => {
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
        await sleep(500)
        await productModel.deleteProduct(productRef.id)

        const product = await productRef.resolve()
        expect(product?.deleted).toEqual(true)
    })

    test('Product delete hard', async () => {
        const productModelHardDelete = new FirebaseProductModel(sdk, productConverter, {
            deleteMode: 'hard',
            readMode: 'static',
        })

        const productRef = await productModelHardDelete.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(500)
        const productBeforeDelete = await productRef.resolve()
        expect(productBeforeDelete).not.toBeUndefined()

        await productModelHardDelete.deleteProduct(productRef.id)

        await productRef.resolve()
        expect(productRef.hasError).toBe(true)
        expect(productRef.error).toEqual(
            expect.objectContaining({ message: expect.stringMatching(/Document does not exist/) })
        )
    })

    test('Product query', async () => {
        const qty = Math.floor(Math.random() * 1000 + 10000)
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })

        const listRef = productModel.getProductList({ filters: [['qty', '==', qty]] })
        await listRef.resolve()

        expect(listRef.values.length).toEqual(1)
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })
        await productModel.createProduct({ name: 'test', desciption: 'test', qty })

        await listRef.resolve()
        expect(listRef.values.length).toEqual(3)
    })

    test('Product transaction static', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(500)
        await productModel.updateStockTwiceWithTransaction(productRef.id, 10)
        await productRef.resolve()
        await sleep(500)
        expect(productRef.value?.qty).toEqual(21)
    })

    test('Product transaction on failed transaction', async () => {
        const productRef = await productModel.createProduct({ name: 'test', desciption: 'test', qty: 1 })
        await sleep(500)
        await expect(productModel.updateStockWithTransactionWithError(productRef.id, 10)).rejects.toThrow()
        await productRef.resolve()
        await sleep(500)
        expect(productRef.value?.qty).toEqual(1)
    })
})
