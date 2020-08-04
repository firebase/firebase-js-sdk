---
"@firebase/firestore": patch
---

The SDK no longer crashes with the error "The database connection is closing". Instead, the individual operations that cause this error may be rejected.
