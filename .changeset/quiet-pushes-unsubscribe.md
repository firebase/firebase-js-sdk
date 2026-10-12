---
'@firebase/messaging': patch
'firebase': patch
---

`unregister()` now also unsubscribes the browser push subscription (matching `deleteToken()`) when the service worker registration is known to the `Messaging` instance, so the deleted registration's endpoint can no longer receive pushes.
