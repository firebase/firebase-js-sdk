---
'@firebase/firestore': minor
'@firebase/firestore-types': minor
---

[feature] Added `not-in` and `!=` query operators for use with `.where()`. `not-in` finds documents where a specified field’s value is not in a specified array. `!=` finds documents where a specified field's value does not equal the specified value. Neither query operator will match documents where the specified field is not present.
