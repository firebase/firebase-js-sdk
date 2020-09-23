---
"@firebase/firestore": patch
---

Fixes an issue that prevents `waitForPendingWrites()` from resolving in background tabs when multi-tab is used (https://github.com/firebase/firebase-js-sdk/issues/3816).
