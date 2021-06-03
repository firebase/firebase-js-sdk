---
"@firebase/component": patch
"@firebase/firestore": patch
---

Fixes a regression that prevented Firestore from detecting Auth during its initial initialization, which could cause some writes to not be send.
