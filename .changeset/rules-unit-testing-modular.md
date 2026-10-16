---
'@firebase/rules-unit-testing': minor
---

Migrate to modular SDK v9+ bindings (`@firebase/app`, `@firebase/firestore`, `@firebase/database`, `@firebase/storage`), resolving prototype identity mismatch when testing rules with modular `serverTimestamp()` or `Timestamp` instances (#6077).
