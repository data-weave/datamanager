---
'@data-weave/backend-firestore': patch
---

`upsert()` (and `create()` with `merge: true`) keeps an existing document's `createdAt` when `preventOverwriteOnCreate` is off. Previously it was reset to the current time on every upsert.
