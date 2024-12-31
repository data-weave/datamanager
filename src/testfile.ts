import { FirestoreDataConverter, QueryDocumentSnapshot, DocumentData, SnapshotOptions } from "@firebase/firestore-types"
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { firestore } from "firebase-admin";
import { FirebaseDataManager } from "./firestoreDataManager";

interface Product {
    name: string
    desciption: string
}

// TODO: setup a way for the serialization type to pick up on the
// interface's props.
const productConverter: FirestoreDataConverter<Product> = {
    toFirestore: function (modelObject: Product): DocumentData {
        return {
            name: modelObject.name,
            description: modelObject.desciption
        }
    },
    fromFirestore: function (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Product {
        const data = snapshot.data(options);
        return {
            name: data.name,
            desciption: data.desciption
        }
    }
}

const main = async () => {
    const app = initializeApp({
        credential: applicationDefault(),
        // databaseURL: 'https://<DATABASE_NAME>.firebaseio.com'
    });
    const db = firestore()
    const productDatamanger = new FirebaseDataManager<Product>(db as any, 'temp', productConverter)
    // const ref = productDatamanger.getRef("apples")
    productDatamanger.create({name: 'fsdfsm;', desciption: "fasdfs"})
    // const product = await ref.resolve();
    // console.log(product)
}
main();