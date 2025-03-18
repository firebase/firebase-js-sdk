---
'@firebase/app-check': patch
---

Improve error handling in AppCheck. The publicly-exported `getToken()` will now throw `internalError` strings it was previously ignoring.
