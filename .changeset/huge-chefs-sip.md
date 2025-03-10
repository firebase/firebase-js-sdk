---
'@firebase/messaging': minor
---

Allows @firebase/messaging to fail gracefully if the service worker is not found for whatever reason (i.e. Capacitor app (my use case), iOS PWA, etc) instead of crashing the entire application.
