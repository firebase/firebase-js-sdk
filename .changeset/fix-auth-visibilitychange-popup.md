---
'@firebase/auth': patch
---

Fix issue where `signInWithPopup` and other background tab operations fail with "Database is closing/hidden" by removing the `visibilitychange` listener from `IndexedDBLocalPersistence`.
