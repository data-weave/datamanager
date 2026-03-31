import { createModularFirestoreAdapter } from '@data-weave/backend-firestore'
import admin, { apps, firestore } from 'firebase-admin'
import { initializeApp as initializeAdminApp } from 'firebase-admin/app'
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import { initializeFirestore } from 'firebase/firestore'

export const initializeJS_SDK = () => {
    let firebaseApp: FirebaseApp
    if (getApps().length === 0) {
        firebaseApp = initializeApp({
            projectId: 'demo-test-project',
        })
    } else {
        firebaseApp = getApp()
    }

    const db = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true,
        host: 'localhost:8080',
        ssl: false,
    })

    return createModularFirestoreAdapter(db)
}

export const initializeAdmin_SDK = () => {
    if (apps.length === 0) {
        initializeAdminApp({
            projectId: 'demo-test-project',
        })
    }

    const db = firestore()

    db.settings({
        ignoreUndefinedProperties: true,
        host: 'localhost:8080',
        ssl: false,
    })

    return {
        db,
        fieldValue: admin.firestore.FieldValue,
    }
}
