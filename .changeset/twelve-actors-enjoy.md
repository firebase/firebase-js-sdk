---
'@firebase/auth': minor
'firebase': minor
---

Implemented `authStateReady()`, which returns a promise that resolves immediately when the initial auth state is settled and currentUser is available. When the promise is resolved, the current user might be a valid user or null if there is no user signed in currently.
