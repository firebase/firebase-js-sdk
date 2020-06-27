---
"@firebase/messaging": patch
"firebase": patch
---

Fixed an issue where we try to update token for every getToken() call because we don't save the updated token in the IndexedDB.
