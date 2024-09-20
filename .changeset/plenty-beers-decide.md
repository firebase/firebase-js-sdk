---
'@firebase/rules-unit-testing': patch
'@firebase/firestore-compat': patch
'@firebase/functions-compat': patch
'@firebase/storage-compat': patch
'@firebase/auth-compat': patch
'@firebase/firestore': patch
'@firebase/functions': patch
'@firebase/storage': patch
'@firebase/auth': patch
---

Removed dependency on undici and node-fetch in our node bundles, replacing them with the native fetch implementation.
