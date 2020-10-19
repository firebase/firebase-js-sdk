---
"@firebase/util": patch
---

Write template data to a new `customData` field in` FirebaseError` instead of writing to the error object itself to avoid overwriting existing fields.
