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
            apiKey: 'AIzaSyC9QAwiRK4tBmeed5xaE-N6x0ks1ceN-oU',
            authDomain: 'datamanager-testing.firebaseapp.com',
            projectId: 'datamanager-testing',
            storageBucket: 'datamanager-testing.firebasestorage.app',
            messagingSenderId: '515755042265',
            appId: '1:515755042265:web:e564bff82167b9abc1a5c8',
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
