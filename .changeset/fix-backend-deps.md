---
'@data-weave/backend-firestore': patch
---

Declare runtime dependencies: `@data-weave/datamanager` is now a dependency and `firebase` a peer dependency. Previously both were dev-only, so a fresh install failed with "Cannot find module".
