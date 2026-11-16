---
'@firebase/util': patch
---

Restrict `emulatorHosts` in the `__FIREBASE_DEFAULTS__` cookie to loopback page origins and loopback target hosts, and ignore `forceEnvironment` when supplied via cookie.
