---
'firebase': patch
---

Fixed the compat CDN bundles `firebase-compat.js` and `firebase-firestore-compat.js`, which contained ES2022 syntax (static class fields) and failed to load in browsers that support only ES2020.
