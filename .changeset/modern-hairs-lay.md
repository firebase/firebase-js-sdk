---
'@firebase/firestore': patch
---

Fixed an issue where `MemoryLruGarbageCollector` (the default garbage collector for `memoryLocalCache()`) never started its periodic garbage collection scheduler, and fixed sequence number and target count bookkeeping in `MemoryPersistence` across repeated collection cycles.
