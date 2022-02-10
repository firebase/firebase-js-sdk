---
"@firebase/firestore": patch
---

On browsers that support IndexedDB V3, we now invoke `transaction.commit()` to speed up data processing.
