---
'@firebase/database': patch
---

Fixed `INTERNAL ASSERT FAILED: listen() called twice for same path/queryId` when listening on a query after a `get()` of the same query resolved while an `onlyOnce` listener on it was waiting for its initial data. The listen of that listener was never stopped.
