---
"@firebase/database-types": patch
"@firebase/database": patch
---

Added interface `Database` which is implemented by `FirebaseDatabase. This allows consumer SDKs (such as the Firebase Admin SDK) to export the database types as an interface.
