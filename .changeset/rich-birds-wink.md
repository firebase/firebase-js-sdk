---
'@firebase/firestore': minor
---
A write to a document that contains field transforms is no longer split into separate operations. This reduces the number of writes that the backend performs.