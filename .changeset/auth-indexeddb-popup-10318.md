---
'@firebase/auth': patch
---

Allow IndexedDB persistence reconnection on demand after `pagehide` events, fixing `Database is closing` errors during `signInWithPopup` authentication on iPadOS and iOS Safari.
