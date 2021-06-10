---
'@firebase/firestore': patch
---

Fixes a regression that prevented Firestore from detecting Auth during its initial initialization, which could cause some writes to not be send.
[4971](https://github.com/firebase/firebase-js-sdk/pull/4971) didn't actually fix it.