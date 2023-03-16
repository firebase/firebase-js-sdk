---
'@firebase/firestore': patch
'firebase': patch
---

Check that DOMException exists before referencing it, to fix react-native, which was broken by https://github.com/firebase/firebase-js-sdk/pull/7019 in v9.17.2.
