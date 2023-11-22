---
'@firebase/firestore': patch
'firebase': patch
---

Fixed an issue in the local cache synchronization logic where all locally-cached documents that matched a resumed query would be unnecessarily re-downloaded; with the fix it now only downloads the documents that are known to be out-of-sync.

