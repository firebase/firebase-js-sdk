---
'@firebase/messaging': patch
---

Fix an issue where PushManager.subscribe() is called too soon after registering the default service worker.
