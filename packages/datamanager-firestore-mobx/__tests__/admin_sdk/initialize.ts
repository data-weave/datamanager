import admin, { apps, firestore } from 'firebase-admin'
import { applicationDefault, initializeApp } from 'firebase-admin/app'

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
