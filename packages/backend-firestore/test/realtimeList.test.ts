import { Firestore, FirestoreDataConverter, FirestoreDataManager } from '@data-weave/backend-firestore'
import { LiveList } from '@data-weave/datamanager'
import { FirebaseProductModel, productConverter } from '@test-fixtures/product'
import { getSDK, sleep } from '@test-fixtures/utils'
import assert from 'node:assert/strict'
import { before, beforeEach, describe, test } from 'node:test'

let sdk: Firestore
let productModel: FirebaseProductModel

before(() => {
    sdk = getSDK()
})

beforeEach(() => {
    productModel = new FirebaseProductModel(sdk, productConverter, { readMode: 'realtime', disableCache: true })
})

const create = (name: string, qty: number) => productModel.createProduct({ name, desciption: name, qty, data: {} })

async function resolvedList() {
    const list = productModel.getProductList({ orderBy: [['qty', 'asc']] }) as unknown as LiveList<{ name: string }>
    await list.resolve()
    let notifications = 0
    list.registerOnChangeListener(() => notifications++)
    return { list, names: () => list.values.map(p => p.name), notifications: () => notifications }
}

describe('Firestore realtime list incremental updates', () => {
    test('modified document that changes position moves instead of overwriting', async () => {
        const a = await create('a', 1)
        await create('b', 2)
        await create('c', 3)
        const { list, names } = await resolvedList()
        assert.deepEqual(names(), ['a', 'b', 'c'])

        await productModel.updateProduct(a.id, { qty: 10 })
        await sleep(500)
        assert.deepEqual(names(), ['b', 'c', 'a'])
        list.unsubscribe()
    })

    test('added and removed documents land at the right index', async () => {
        await create('a', 1)
        const c = await create('c', 3)
        const { list, names } = await resolvedList()

        await create('b', 2)
        await sleep(500)
        assert.deepEqual(names(), ['a', 'b', 'c'])

        await productModel.deleteProduct(c.id)
        await sleep(500)
        assert.deepEqual(names(), ['a', 'b'])
        list.unsubscribe()
    })

    test('in-place modification updates the value', async () => {
        const a = await create('a', 1)
        await create('b', 2)
        const { list, names } = await resolvedList()

        await productModel.updateProduct(a.id, { name: 'a2' })
        await sleep(500)
        assert.deepEqual(names(), ['a2', 'b'])
        list.unsubscribe()
    })

    test('each update publishes a new array reference', async () => {
        await create('a', 1)
        const { list } = await resolvedList()
        const before = list.values

        await create('b', 2)
        await sleep(500)
        assert.equal(list.values.length, 2)
        assert.notEqual(list.values, before, 'values must be a new array so reference-equality consumers re-render')
        assert.deepEqual(
            before.map(p => p.name),
            ['a'],
            'previously published array must not be mutated'
        )
        list.unsubscribe()
    })

    test('a batch of changes notifies once', async () => {
        await create('a', 1)
        const { list, names, notifications } = await resolvedList()

        // One transaction commits atomically, so the listener gets a single snapshot with three changes
        await productModel.createProductsWithTransaction([
            { name: 'b', desciption: 'b', qty: 2, data: {} },
            { name: 'c', desciption: 'c', qty: 3, data: {} },
            { name: 'd', desciption: 'd', qty: 4, data: {} },
        ])
        await sleep(800)
        assert.deepEqual(names(), ['a', 'b', 'c', 'd'])
        assert.equal(notifications(), 1)
        list.unsubscribe()
    })
})

// The Admin SDK's `data()` takes no snapshot options, so this plumbing only exists on the client SDK
describe('Firestore list snapshot options', { skip: process.env.SDK_TYPE === 'ADMIN_SDK' }, () => {
    test('list reads pass the manager snapshotOptions to the converter', async () => {
        const seen: unknown[] = []
        const spyConverter: FirestoreDataConverter<{ name: string }> = {
            toFirestore: m => ({ name: m.name }),
            fromFirestore: (snapshot, options) => {
                seen.push(options)
                return { name: snapshot.data(options).name }
            },
        }
        const snapshotOptions = { serverTimestamps: 'estimate' } as const
        const collection = `public_products_${Date.now()}`
        const options = { snapshotOptions, disableCache: true }

        const staticManager = new FirestoreDataManager(sdk, collection, spyConverter, options)
        await staticManager.create({ name: 'a' })
        seen.length = 0
        await staticManager.getList().resolve()
        assert.ok(seen.length > 0)
        assert.ok(
            seen.every(o => o === snapshotOptions),
            'static read'
        )

        const realtime = new FirestoreDataManager(sdk, collection, spyConverter, { ...options, readMode: 'realtime' })
        const list = realtime.getList() as unknown as LiveList<{ name: string }>
        seen.length = 0
        await list.resolve()
        assert.ok(seen.length > 0 && seen.every(o => o === snapshotOptions), 'realtime first load')

        seen.length = 0
        await realtime.create({ name: 'b' })
        await sleep(500)
        assert.equal(list.values.length, 2)
        assert.ok(seen.length > 0 && seen.every(o => o === snapshotOptions), 'realtime incremental update')
        list.unsubscribe()
    })
})
