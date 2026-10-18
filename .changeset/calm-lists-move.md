---
'@data-weave/backend-firestore': minor
'@data-weave/firestore-admin-adapter': minor
---

Realtime `FirestoreList` applies `docChanges()` incrementally again instead of rebuilding the list from every snapshot. Documents whose sort position changes now move instead of overwriting another entry, each snapshot publishes a new `values` array, and a batch of changes notifies listeners once.

Breaking: the `Firestore` adapter contract is now an interface built from the modular SDK's own function types, and `FieldValues` / `FirestoreApp` are types instead of abstract classes. Custom adapters must use `implements Firestore` instead of `extends Firestore`. The unused `FirestoreFunctions`, `DummyFirestoreFunctions`, `FirestoreSettings`, `FirestoreAppSettings`, `FirestoreQuery` and `FirestoreWhere` exports are removed. `query` accepts several constraints in one call on both adapters; `FirestoreAdminAdapter` previously applied only the first.
