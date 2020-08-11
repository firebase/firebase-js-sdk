---
"@firebase/firestore": patch
---

Removed an authentication fallback that may have caused excessive usage of Firebase Auth's `getToken` API.
