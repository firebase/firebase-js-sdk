---
'@firebase/firestore': patch
'firebase': patch
---

Fix transaction.set() failure without retry on "already-exists" error.
