---
'@firebase/app': patch
---

Catch `transaction.done` errors in `readHeartbeatsFromIndexedDB` and log them as a warning, because platform logging errors should never throw or block user app functionality.
