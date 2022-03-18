---
"@firebase/firestore": patch
---

The format of some of the IndexedDB data changed. This increases the performance of document lookups after an initial migration. If you do not want to migrate data, you can call `clearIndexedDbPersistence()` before invoking `enableIndexedDbPersistence()`.
