import { Firestore, FirestoreReferenceError } from '@data-weave/backend-firestore'
import { describe, expect, test } from '@jest/globals'
import { FirebaseProductModel, productConverter } from '@test-fixtures/product'
import { getSDK } from '@test-fixtures/utils'
import { ObservableList } from '../src'

let sdk: Firestore

beforeAll(() => {
    sdk = getSDK()
})

let productModel: FirebaseProductModel
let restrictedProductModel: FirebaseProductModel
// This is a workaround to skip tests that are only relevant for the JS SDK
const jsOnlyTest = process.env.SDK_TYPE === 'ADMIN_SDK' ? test.skip : test

beforeEach(() => {
    productModel = new FirebaseProductModel(sdk, productConverter, {
        readMode: 'realtime',
        ListProxy: ObservableList,
    })

    restrictedProductModel = new FirebaseProductModel(
        sdk,
        productConverter,
        {
            readMode: 'realtime',
            ListProxy: ObservableList,
        },
        'private_products_on_error'
    )
})

describe('Firebase typed error tests', () => {
    test('should wrap error with FirestoreReferenceError and context for document reference', async () => {
        const ref = productModel.getProduct('non-existent-id')
        await ref.resolve()

        expect(ref.hasError).toBe(true)
        expect(ref.error).toBeInstanceOf(FirestoreReferenceError)

        const refError = ref.error as FirestoreReferenceError
        expect(refError.context.type).toBe('reference')
        expect(refError.context.path).toContain('products')
        expect(refError.context.id).toBe('non-existent-id')
        expect(refError.context.readMode).toBe('realtime')
        expect(refError.cause).toBeInstanceOf(Error)
    })

    test('should resolve without error for valid list reference', async () => {
        const list = productModel.getProductList()
        const values = await list.resolve()

        expect(values).toBeDefined()
        expect(list.hasError).toBe(false)
    })

    jsOnlyTest('should wrap error with FirestoreListError for complex list query', async () => {
        const list = restrictedProductModel.getProductList({
            filters: [
                ['name', '==', 'test'],
                ['qty', '>', 0],
            ],
            orderBy: [['desciption', 'asc']],
        })
        expect(list.hasError).toBe(false)
        await list.resolve()
        expect(list.hasError).toBe(true)
        expect(list.error).toEqual(expect.objectContaining({ name: 'FirestoreListError' }))

        const listError = list.error as {
            context: { type: 'list'; query: unknown; readMode?: string }
            cause: unknown
        }
        expect(listError.context.type).toBe('list')
        expect(listError.context.query).toBeDefined()
        expect(listError.context.readMode).toBe('realtime')
        expect(listError.cause).toBeInstanceOf(Error)
    })

    jsOnlyTest('should wrap error with FirestoreListError for restricted query', async () => {
        const list = restrictedProductModel.getProductList({
            filters: [['__deleted', '==', true]],
        })

        expect(list.hasError).toBe(false)
        await list.resolve()
        expect(list.hasError).toBe(true)
        expect(list.error).toEqual(expect.objectContaining({ name: 'FirestoreListError' }))

        const listError = list.error as {
            context: { type: 'list'; query: unknown; readMode?: string }
            cause: unknown
        }
        expect(listError.context.type).toBe('list')
        expect(listError.context.query).toBeDefined()
        expect(listError.context.readMode).toBe('realtime')
        expect(listError.cause).toBeInstanceOf(Error)
    })
})
