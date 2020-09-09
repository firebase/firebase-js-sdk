---
'@firebase/util': patch
---

Moved `calculateBackoffMillis()` exponential backoff function from remote-config to util,
where it can be shared between packages.
