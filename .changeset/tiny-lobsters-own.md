---
'@firebase/auth': patch
---

Protection from enumerating an empty list in Auth's reading of IndexedDB results, as this causes errors in some macOS and iOS browser runtimes.
