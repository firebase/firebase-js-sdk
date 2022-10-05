---
"@firebase/storage": patch
---

Fixed bug where upload status wasn't being checked after an upload failure.
Implemented exponential backoff and max retry strategy.
