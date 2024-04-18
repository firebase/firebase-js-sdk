---
'@firebase/firestore': patch
'firebase': patch
---

Prevent spurious "Backend didn't respond within 10 seconds" errors when network is indeed responding, just slowly.
