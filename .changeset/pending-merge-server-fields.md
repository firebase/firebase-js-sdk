---
"@firebase/firestore": patch
---

Fixed `getDocFromServer` dropping server-only fields while a `setDoc` merge is pending and the document is not yet in the local cache.
