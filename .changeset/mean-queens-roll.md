---
"@firebase/firestore": patch
---

Fixes an issue that prevent `waitForPendingWrites()` to resolve in background tabs when multi-tab is used.
