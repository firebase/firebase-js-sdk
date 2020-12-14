---
"@firebase/database": patch
---

Fixes an issue that caused `refFromUrl()` to reject production database URLs when `useEmulator()` was used.
