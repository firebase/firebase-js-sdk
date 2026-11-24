---
'@firebase/firestore': patch
---

Fixed an issue where `waitForPendingWrites()` never resolved when IndexedDB persistence was enabled and a different user with a lexicographically earlier user ID had unacknowledged writes in the local cache. ([#10666](https://github.com/firebase/firebase-js-sdk/issues/10666))
