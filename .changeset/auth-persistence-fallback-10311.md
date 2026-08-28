---
'@firebase/auth': patch
---

Gracefully fall back to in-memory persistence when persistence initialization fails or storage is inaccessible, preventing initialization deadlocks and ensuring `authStateReady()` resolves.
