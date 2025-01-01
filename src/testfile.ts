import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { firestore } from 'firebase-admin'
import { FirebaseDataManager } from './firestoreDataManager'
import { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions } from './firestoreAppCompatTypes'
import firebase from 'firebase/compat/app'



interface Product {
    name: string
    desciption: string
    qty: number
}

// TODO: setup a way for the serialization type to pick up on the
// interface's props.
const productConverter: FirestoreDataConverter<Product, Product> = {
    toFirestore: function (modelObject: Product): Product {
        return {
            name: modelObject.name,
            description: modelObject.desciption,
        }
    },
    fromFirestore: function (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Product {
        const data = snapshot.data(options)
        return {
            name: data.name,
            desciption: data.desciption,
        }
    },
}

const main = async () => {
    initializeApp({
        credential: applicationDefault(),
        // databaseURL: 'https://<DATABASE_NAME>.firebaseio.com'
    })
    const db = firestore()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productDatamanger = new FirebaseDataManager<Product>(db as any, 'temp', productConverter)
    // const ref = productDatamanger.getRef("apples")
    productDatamanger.create({ name: 'fsdfsm;', desciption: 'fasdfs' })
    productDatamanger.update('apples', { name: 'test', desciption: 'test'})
    // const product = await ref.resolve();
    // console.log(product)
}
main()
