---
'@firebase/messaging': minor
---

Allows @firebase/messaging to fail gracefully if the service worker is not found for whatever reason (i.e. Capacitor app, iOS Safari on some devices, etc) instead of crashing the entire application.
