---
'@firebase/auth': patch
'@firebase/auth-compat': patch
'@firebase/database': patch
'@firebase/database-compat': patch
'firebase': patch
'@firebase/firestore': patch
'@firebase/firestore-compat': patch
'@firebase/functions': patch
'@firebase/functions-compat': patch
'@firebase/rules-unit-testing': patch
'@firebase/storage': patch
'@firebase/template': patch
'@firebase/util': patch
---

Move exports.default fields to always be the last field. This fixes a bug caused in 9.17.0 that prevented some bundlers and frameworks from building.
