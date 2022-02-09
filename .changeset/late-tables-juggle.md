---
"@firebase/firestore": patch
---

Some database operations now use `IndexedDB.getAll()` on browsers where support is availbe.
