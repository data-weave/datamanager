import firebase from 'firebase/compat/app'

export type DocumentData = firebase.firestore.DocumentData

export type QueryDocumentSnapshot<T = DocumentData> = firebase.firestore.QueryDocumentSnapshot<T>
export type DocumentReference<T = DocumentData> = firebase.firestore.DocumentReference<T>
export type CollectionReference<T = DocumentData> = firebase.firestore.CollectionReference<T>
export type FirestoreDataConverter<T> = firebase.firestore.FirestoreDataConverter<T>
export type Firestore = firebase.firestore.Firestore
