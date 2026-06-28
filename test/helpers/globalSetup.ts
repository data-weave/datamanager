import { FirestoreEmulatorContainer, type StartedFirestoreEmulatorContainer } from '@testcontainers/gcloud'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const GCLOUD_EMULATOR_IMAGE = 'gcr.io/google.com/cloudsdktool/cloud-sdk:475.0.0-emulators'
const PROJECT_ID = 'demo-test-project'

declare global {
    // eslint-disable-next-line no-var
    var __FIRESTORE_CONTAINER__: StartedFirestoreEmulatorContainer | undefined
}

export async function globalSetup(): Promise<void> {
    console.log('[test] starting Firestore emulator container...')
    const container = await new FirestoreEmulatorContainer(GCLOUD_EMULATOR_IMAGE).start()

    process.env.FIRESTORE_EMULATOR_HOST = container.getEmulatorEndpoint()
    globalThis.__FIRESTORE_CONTAINER__ = container
    console.log(`[test] Firestore emulator ready at ${process.env.FIRESTORE_EMULATOR_HOST}`)

    const rulesPath = path.resolve(process.cwd(), 'firestore.rules')
    const resp = await fetch(
        `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}:securityRules`,
        {
            method: 'PUT',
            body: JSON.stringify({ rules: { files: [{ content: readFileSync(rulesPath, 'utf8') }] } }),
        }
    )
    if (!resp.ok) {
        const body = await resp.text()
        await container.stop()
        throw new Error(`Failed to load firestore rules into emulator: ${resp.status} ${body}`)
    }
}

export async function globalTeardown(): Promise<void> {
    const container = globalThis.__FIRESTORE_CONTAINER__
    if (container) {
        await container.stop()
        globalThis.__FIRESTORE_CONTAINER__ = undefined
    }
}
