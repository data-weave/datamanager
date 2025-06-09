import { initializeApp, getApps, FirebaseApp, getApp } from 'firebase/app'
import {
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
    doc,
    onSnapshot,
    increment,
    runTransaction,
    initializeFirestore,
    deleteDoc,
} from 'firebase/firestore'

export const initializeJS_SDK = () => {
    let firebaseApp: FirebaseApp
    if (getApps().length === 0) {
        firebaseApp = initializeApp({
            apiKey: '',
            authDomain: '',
            projectId: '',
            storageBucket: '',
            messagingSenderId: '',
            appId: '',
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
