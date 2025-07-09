---
'@firebase/firestore': minor
'firebase': minor
---

Added support for Firestore result types to be serialized with `toJSON` and then deserialized with `fromJSON` methods on the objects.

Addeed support to resume `onSnapshot` listeners in the CSR phase based on serialized `DataSnapshot`s and `QuerySnapshot`s built in the SSR phase. 
