---
'@firebase/storage': patch
---

Fixed `deleteObject()` rejecting with `storage/object-not-found` when an automatic retry follows an attempt that had already deleted the object.
