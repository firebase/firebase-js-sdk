---
'@firebase/messaging': patch
---

Await briefly to allow onBackgroundMessage to complete. This resolves false-positive silent push warnings from the browsers.
