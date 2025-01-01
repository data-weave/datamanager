import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { firestore } from 'firebase-admin'
import { FirebaseDataManager } from './firestoreDataManager'
import { DocumentData, Firestore, FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions } from './firestoreAppCompatTypes'
import { Reference } from './reference'



interface Product {
    name: string
    desciption: string
    qty: number
}

// TODO: setup a way for the serialization type to pick up on the
// interface's props.
const productConverter: FirestoreDataConverter<Product> = {
    toFirestore: function (modelObject: Product): Product { //NOTE: this can be any return type
        return {
            name: modelObject.name,
            desciption: modelObject.desciption,
            qty: modelObject.qty
        }
    },
    fromFirestore: function (snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Product {
        const data = snapshot.data(options)
        return {
            name: data.name,
            desciption: data.desciption,
            qty: data.qty
        }
    },
}

type UpdateProductParams = Partial<Pick<Product, 'qty' | 'desciption' | 'name'>>

abstract class ProductModel {
    abstract getProduct(id: string): Promise<Reference<Product>>;
    abstract updateProduct(id: string, params: UpdateProductParams): Promise<void>
}
class FirebaseProductModel implements ProductModel {
    private datamanager: FirebaseDataManager<Product>;

    constructor(
        private readonly db: Firestore,
        converter: FirestoreDataConverter<Product>) {
            this.datamanager = new FirebaseDataManager<Product>(db as any, 'temp', converter)
    }

    async getProduct(id: string): Promise<Reference<Product>> {
        return this.datamanager.getRef(id);
    }
    updateProduct(id: string, params: UpdateProductParams): Promise<void> {
        this.datamanager.update(id, {...params})
    }
    
}

const main = async () => {
    initializeApp({
        credential: applicationDefault(),
        // databaseURL: 'https://<DATABASE_NAME>.firebaseio.com'
    })
    const db = firestore()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const productModel = new FirebaseProductModel(db as any, productConverter)
    productModel.updateProduct("apples", {qty: 4})
    // const ref = productDatamanger.getRef("apples")
    // productDatamanger.create({ name: 'fsdfsm;', desciption: 'fasdfs' })
    // productDatamanger.update('apples', { name: 'test', desciption: 'test'})
    // const product = await ref.resolve();
    // console.log(product)
}
main()
