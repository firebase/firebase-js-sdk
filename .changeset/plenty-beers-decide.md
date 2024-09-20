---
'@firebase/rules-unit-testing': patch
'@firebase/app-check-compat': patch
'@firebase/firestore-compat': patch
'@firebase/functions-compat': patch
'@firebase/database-compat': patch
'@firebase/storage-compat': patch
'@firebase/auth-compat': patch
'@firebase/app-compat': patch
'@firebase/app-check': patch
'@firebase/component': patch
'@firebase/firestore': patch
'@firebase/functions': patch
'@firebase/database': patch
'@firebase/storage': patch
'@firebase/logger': patch
'@firebase/auth': patch
'@firebase/util': patch
'@firebase/app': patch
---

Removed dependency on undici and node-fetch in our node bundles, replacing them with the native fetch implementation.
