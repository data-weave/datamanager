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

export const initializeJS_SDK = () => {
    let firebaseApp: FirebaseApp
    if (getApps().length === 0) {
        firebaseApp = initializeApp({
            apiKey: 'AIzaSyCZ7AC43HLENNMN_uq80EINtAqQ_A3xxJ8',
            authDomain: 'test-project-charge.firebaseapp.com',
            projectId: 'test-project-charge',
            storageBucket: 'test-project-charge.firebasestorage.app',
            messagingSenderId: '85196408854',
            appId: '1:85196408854:web:3ddcc34accc86785908d37',
            measurementId: 'G-RXN14NVLJ1',
        })
    } else {
        firebaseApp = getApp()
    }

    const firestore = initializeFirestore(firebaseApp, {
        ignoreUndefinedProperties: true,
    })

    return {
        app: firestore,
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
