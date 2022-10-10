---
'@firebase/util': patch
---

Remove `__FIREBASE_DEFAULTS_PATH__` option for now, as the current implementation causes Webpack warnings. Also fix `process.env` check to work in environments where `process` exists but `process.env` does not.
