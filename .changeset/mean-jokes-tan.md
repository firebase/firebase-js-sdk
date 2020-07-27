---
'firebase': patch
'@firebase/firestore': patch
'@firebase/firestore-types': patch
---
feat: Added `inherit` option to `firestore.settings()`, which merges the provided settings with
settings from a previous call. This allows adding settings on top of the settings that were applied
by `@firebase/testing`.
