---
'@firebase/firestore': minor
---

Removed validation of `null` and `NaN` values in filters. However, note that only `==` and `!=` filters match against `null` and `NaN`.
