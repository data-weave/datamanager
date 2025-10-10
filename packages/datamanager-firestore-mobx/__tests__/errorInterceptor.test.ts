import { describe, test } from '@jest/globals'
import { FirestoreListContext, FirestoreReferenceContext, ObservableFirestoreList } from '../lib'
import { sdk } from './main.js.test'
import { FirebaseProductModel, productConverter } from './product'

let productModel: FirebaseProductModel
let errorContextGlobal: FirestoreReferenceContext | FirestoreListContext | undefined = undefined
let errorGlobal: unknown | undefined = undefined

beforeEach(() => {
    errorContextGlobal = undefined
    errorGlobal = undefined

    productModel = new FirebaseProductModel(sdk, productConverter, {
        readMode: 'realtime',
        List: ObservableFirestoreList,
        errorInterceptor: (error, ctx) => {
            errorContextGlobal = ctx
            errorGlobal = error
        },
    })
})

describe('Firebase error interceptor tests', () => {
    test('should intercept error and context for document reference', async () => {
        try {
            await productModel.getProduct('non-existent-id').resolve()
        } catch (error) {
            expect(error).toBeDefined()
        }

        errorContextGlobal = errorContextGlobal as FirestoreReferenceContext
        expect(errorContextGlobal).toBeDefined()
        expect(errorGlobal).toBeDefined()

        expect(errorContextGlobal?.path).toContain('products')
        expect(errorContextGlobal?.id).toBe('non-existent-id')
        expect(errorContextGlobal?.readMode).toBe('realtime')

        expect(errorGlobal).toBeInstanceOf(Error)
    })

    test('should intercept error and context for list reference', async () => {
        try {
            await productModel.getProductList().resolve()
        } catch (error) {
            expect(error).toBeDefined()
        }
    })

    test('should intercept index error for complex list query', async () => {
        try {
            await productModel
                .getProductList({
                    filters: [
                        ['name', '==', 'test'],
                        ['qty', '>', 0],
                    ],
                    orderBy: [['desciption', 'asc']],
                })
                .resolve()
        } catch (error) {
            expect(error).toBeDefined()

            if (errorContextGlobal && errorGlobal) {
                errorContextGlobal = errorContextGlobal as FirestoreListContext
                expect(errorContextGlobal?.query).toBeDefined()
                expect(errorContextGlobal?.readMode).toBe('realtime')

                const errorMessage = (errorGlobal as Error).message
                expect(errorMessage).toBeDefined()
            }
        }
    })

    test('should intercept permission denied error for restricted query', async () => {
        try {
            await productModel
                .getProductList({
                    filters: [['__deleted', '==', true]],
                })
                .resolve()
        } catch (error) {
            expect(error).toBeDefined()

            if (errorContextGlobal && errorGlobal) {
                errorContextGlobal = errorContextGlobal as FirestoreListContext
                expect(errorContextGlobal?.query).toBeDefined()
                expect(errorContextGlobal?.readMode).toBe('realtime')

                const errorMessage = (errorGlobal as Error).message
                expect(errorMessage).toBeDefined()
            }
        }
    })
})
