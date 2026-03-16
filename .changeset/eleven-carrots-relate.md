---
'@firebase/firestore': patch
---

**Beta API Breaking change**: Defer pipeline user data validation from initialization to `execute()`. This breaking change is allowed in a non-major release since the Firestore Pipelines API is currently in Public Preview.
