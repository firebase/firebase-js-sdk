---
'@firebase/data-connect': patch
---

- Add check for non-query refType in `executeQuery` that throws error on refType mismatch
- Add unit test to check that error is thrown when `executeQuery` receives non-query refType, and not thrown otherwise
