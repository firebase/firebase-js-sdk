---
'@firebase/firestore': patch
---

Fixed a bug that where CollectionReference.add() called FirestoreDataConverter.toFirestore() twice intead of once (#3742).
