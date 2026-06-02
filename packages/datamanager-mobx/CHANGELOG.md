# Change Log

## 0.7.0

### Minor Changes

- e5da806: Cleanup and version alignment

### Patch Changes

- Updated dependencies [e5da806]
    - @data-weave/backend-firestore@0.7.0
    - @data-weave/datamanager@0.7.0

## 2.0.0

### Minor Changes

- Breaking: `FirestoreAdminAdapter` is no longer exported from the main entry. Import it from `@data-weave/backend-firestore/admin` instead. This keeps `firebase-admin` (and its Node-only transitive deps) out of browser bundles.

    Breaking: `firebase`, `@firebase/firestore`, `@google-cloud/firestore`, and `firebase-admin` are now (optional) `peerDependencies`; `@data-weave/datamanager` is a required peer. Install whichever SDK your app uses.

### Patch Changes

- Updated dependencies
    - @data-weave/backend-firestore@2.0.0
    - @data-weave/datamanager@2.0.0

## 1.0.0

### Patch Changes

- Updated dependencies
    - @data-weave/backend-firestore@1.0.0
    - @data-weave/datamanager@1.0.0

## 0.5.1
