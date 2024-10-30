---
"@firebase/firestore": patch
---

Prevent a possible condition of slow snapshots, caused by a rapid series of document update(s) followed by a delete.
