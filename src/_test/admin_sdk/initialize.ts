import admin, { firestore, apps } from 'firebase-admin'
import { initializeApp, applicationDefault } from 'firebase-admin/app'

export const initializeAdmin_SDK = () => {
    if (apps.length === 0) {
        initializeApp({
            credential: applicationDefault(),
        })
    }

    const db = firestore()
    db.settings({ ignoreUndefinedProperties: true })

    return {
        db,
        fieldValue: admin.firestore.FieldValue,
    }
}
