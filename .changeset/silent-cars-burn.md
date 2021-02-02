---
'@firebase/firestore': patch
---

handle `ignoreUndefinedProperties` in `set({ merge: true })`. Previously this would behave as if the undefined value were `FieldValue.delete()`, which wasn't intended.
