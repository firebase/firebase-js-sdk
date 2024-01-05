---
'@firebase/firestore': patch
'firebase': patch
---

Refactor client-side indexing code to be tree-shakable. This should reduce code size by about 23 kB for applications that enable IndexedDb persistence but do _not_ call either `enablePersistentCacheIndexAutoCreation()` or `setIndexConfiguration()`.
