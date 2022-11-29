---
"@firebase/firestore": minor
"firebase": minor
---

Functions in the Firestore package that return QueryConstraints (for example: `where(...)`, `limit(...)`, and `orderBy(...)`)
now return a more specific type, which extends QueryConstraint. Refactoring and code that supports future features is also
included in this release.
