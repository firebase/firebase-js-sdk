---
'@firebase/firestore': patch
---

Fixed an issue where `QuerySnapshot.toJSON()` did not record that the query used `limitToLast()`, so `querySnapshotFromJSON()` and `onSnapshotResume()` rebuilt it as a query with the opposite sort order and returned its documents in reverse order.
