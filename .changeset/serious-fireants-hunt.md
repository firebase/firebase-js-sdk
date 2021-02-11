---
'@firebase/analytics': patch
---

Fixed a behavior causing `gtag` to be downloaded twice on Firebase Analytics initialization. This did not seem to affect the functionality of Firebase Analytics but adds noise to the logs when users are trying to debug.
