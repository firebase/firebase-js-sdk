---
'@firebase/firestore': minor
---

Removed excess validation of null and NaN values in query filters. This more closely aligns the SDK with the Firestore backend, which has always accepted null and NaN for all operators, even though this isn't necessarily useful.
