---
"rxfire": patch
---

* Firestore observables now emit on metadata changes.
* Firestore `collectionChanges`, `sortedChanges` and `auditTrail` will now properly emit `[]` on an empty collection or query.
