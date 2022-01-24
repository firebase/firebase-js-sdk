---
"@firebase/firestore": patch
---

Fixed bug: Firestore listeners stopped working and received a "Permission Denied"
error when App Check token expired (listener was active longer than the App
Check token TTL configured in the Firebase console). The issue does not occur if
listeners were renewed for other reasons such as Authentication token renewal,
listener being idle for a long time, page refresh, etc.
