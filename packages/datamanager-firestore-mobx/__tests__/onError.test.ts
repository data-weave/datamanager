import { FirestoreListContext, FirestoreReferenceContext } from '@data-weave/backend-firestore/src'
import { describe, test } from '@jest/globals'
import { ObservableFirestoreList } from '../src'
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

        if (!errorContextGlobal) {
            fail('errorContextGlobal is undefined')
        }

        if (errorContextGlobal?.type !== 'reference') {
            fail('errorContextGlobal is not a reference context or undefined')
        }

        expect(errorContextGlobal).toBeDefined()
        expect(errorContextGlobal.type).toBe('reference')
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

                if (!(errorGlobal instanceof Error)) {
                    fail('errorGlobal is not an error')
                }

                expect(errorGlobal.message).toBeDefined()
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

            if (!errorContextGlobal) {
                fail('errorContextGlobal is undefined')
            }

            if (errorContextGlobal.type !== 'list') {
                fail('errorContextGlobal is not a list context or undefined')
            }

            expect(errorContextGlobal.type).toBe('list')
            expect(errorContextGlobal.query).toBeDefined()
            expect(errorContextGlobal.readMode).toBe('realtime')

            if (!(errorGlobal instanceof Error)) {
                fail('errorGlobal is not an error')
            }

            expect(errorGlobal.message).toBeDefined()
        }
    })
})
