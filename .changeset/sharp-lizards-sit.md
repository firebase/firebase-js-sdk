---
'@firebase/firestore': patch
'firebase': patch
---

Reduce code size that accidentally regressed in 10.7.2 due to https://github.com/firebase/firebase-js-sdk/pull/7929 for application that did _not_ use IndexedDB persistence
