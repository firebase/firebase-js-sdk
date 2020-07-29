---
"@firebase/database-types": patch
"@firebase/database": patch
---

Added interface `Database` which is implemented by `FirebaseDatabase` to allow the use of interface instead of class for the instance type.
It solves an issue admin SDK encountered where they only want to export the type, but Typescript thinks they are exporting the actual class.
