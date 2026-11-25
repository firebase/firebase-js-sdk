---
'@firebase/firestore': patch
---

Fixed a multi-tab crash that permanently disabled the Firestore client when a target advertised by another tab was missing from this client's target cache.
