---
'@firebase/messaging': patch
---

Fix uncaught rejection in `isSupported()` if environment does not support IndexedDB's `open()` method.
