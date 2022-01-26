---
"@firebase/firestore": patch
---

Fixed an AppCheck issue that caused Firestore listeners to stop working and
receive a "Permission Denied" error. This issue only occurred for AppCheck users
that set their expiration time to under an hour.
