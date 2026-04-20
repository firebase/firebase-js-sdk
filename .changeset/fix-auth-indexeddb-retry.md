---
'@firebase/auth': patch
'firebase': patch
---

Updated `_isAvailable()` to use retry logic for the initial IndexedDB availability check, preventing incorrect fallbacks to in-memory persistence in environments where transactions may occasionally drop on startup.
