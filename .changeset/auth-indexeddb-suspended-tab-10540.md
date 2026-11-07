---
'@firebase/auth': patch
---

Prevent a suspended background tab holding an IndexedDB `readonly` poll transaction from blocking Auth startup (`onAuthStateChanged` / `authStateReady()`) or clearing `currentUser` in other tabs (#10540).
