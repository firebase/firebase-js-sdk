---
'@firebase/performance': patch
---

Expand check in `getServiceWorkerStatus` to account for a `navigator` that has a key of `serviceWorker` with a falsy value
