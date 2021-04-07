---
'@firebase/firestore': patch
---

Fixed a bug where decimal inputs to `Timestamp.fromMillis()` calculated incorrectly due to floating point precision loss
