---
'@firebase/app-check': patch
'@firebase/app-check-types': patch
---

Fixed so token listeners added through public API call the error handler while internal token listeners return the error as a token field.
