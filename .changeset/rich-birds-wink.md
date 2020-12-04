---
'@firebase/firestore': minor
---
A write to a document that contains FieldValue transforms is no longer split up into two separate operations. This reduces the number of writes the backend performs and allows each WriteBatch to hold 500 writes regardless of how many FieldValue transformations are attached.