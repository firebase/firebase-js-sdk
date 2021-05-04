---
"@firebase/database": patch
---

Fixed an issue that could cause `once()` to fire more than once if the value was modified inside its callback.
