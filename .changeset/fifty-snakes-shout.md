---
'@firebase/performance': patch
'firebase': patch
---

Moved `loggingEnabled` check to wait until performance initialization finishes, thus avoid dropping custom traces right after getting `performance` object.
