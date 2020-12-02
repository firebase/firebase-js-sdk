---
'@firebase/firestore': minor
---

Field tranforms performed within a write no longer count as additional operations. However, a field transform on its own still counts as an operation.
