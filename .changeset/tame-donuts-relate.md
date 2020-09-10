---
'@firebase/firestore': patch
---

Fixed a bug that called FirestoreDataConverter.toFirestore() twice on CollectionReference.add() (#3742).
