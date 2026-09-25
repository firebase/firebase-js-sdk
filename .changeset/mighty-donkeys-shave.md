---
'@firebase/database': patch
---

Fix `runTransaction()` so that errors raised by the transaction update function, or by validation of the data it returns, always reject the returned promise. Previously an error raised while the transaction was being rerun surfaced as an uncaught exception and left the promise pending forever, and an error raised during the initial run was thrown synchronously instead of rejecting.
