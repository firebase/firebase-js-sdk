---
"@firebase/firestore": patch
---

Fixes an issue in the Transaction API that caused the SDK to return invalid DocumentReferences through `DocumentSnapshot.data()` calls.
