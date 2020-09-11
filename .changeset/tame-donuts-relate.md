---
'@firebase/firestore': patch
---

Fixed a bug where CollectionReference.add() called FirestoreDataConverter.toFirestore() twice intead of once (#3742).
