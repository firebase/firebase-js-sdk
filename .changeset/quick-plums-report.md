---
'@firebase/messaging': patch
---

Fix `getToken()` intermittently failing with "Service worker not registered after 10000 ms". `waitForRegistrationActive` now resolves once the registration has an active worker and follows replacement workers, instead of only watching the worker observed at registration time (which can become redundant and never fire `activated`).
