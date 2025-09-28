import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app'
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    increment,
    initializeFirestore,
    limit,
    onSnapshot,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
} from 'firebase/firestore'

import admin, { apps, firestore } from 'firebase-admin'
import { initializeApp as initializeAdminApp } from 'firebase-admin/app'

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

    return {
        app: db,
        collection,
        getDocs,
        getDoc,
        serverTimestamp,
        query,
        where,
        limit,
        orderBy,
        setDoc,
        updateDoc,
        deleteDoc,
        doc,
        onSnapshot,
        increment,
        // TODO: fix this
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        runTransaction: runTransaction as any,
    }
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
