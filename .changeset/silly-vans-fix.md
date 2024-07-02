---
'@firebase/firestore': patch
'firebase': patch
---

Refactor client-side indexing to be tree-shakable. This can reduce code size by up to 23 kB for applications that enable IndexedDb persistence but do _not_ call either `enablePersistentCacheIndexAutoCreation()` or `setIndexConfiguration()`.
