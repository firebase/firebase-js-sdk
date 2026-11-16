---
'@firebase/util': patch
---

Restrict `emulatorHosts` in the `__FIREBASE_DEFAULTS__` cookie to loopback page origins and loopback target hosts, and ignore `forceEnvironment` when supplied via cookie. Apps that relied on cookie-based emulator auto-connect from a non-loopback URL (such as a LAN IP) should call `connect*Emulator()` directly.
