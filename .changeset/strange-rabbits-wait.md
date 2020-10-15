---
'firebase': major
'@firebase/firestore': major
'@firebase/firestore-types': major
---

Removed the `timestampsInSnapshots` option from `FirestoreSettings`. Now, Firestore always returns `Timestamp` values for all timestamp values.
