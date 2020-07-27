---
'firebase': patch
'@firebase/firestore': patch
'@firebase/firestore-types': patch
---
feat: Added `inherit` setting to merge the new settings with the settings from a previous call when calling `firestore.settings()`. This allows adding settings on top of the settings that were applied by `@firebase/testing`.
