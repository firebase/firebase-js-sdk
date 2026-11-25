---
'@firebase/firestore': patch
---

Avoid failing the client when a permanent error closes a write stream after all pending writes have been acknowledged.
