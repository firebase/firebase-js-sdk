---
'@firebase/firestore': patch
---

Fixed an issue where calling `enableNetwork()` while the network was already enabled could restart the write stream and fail with `INTERNAL ASSERTION FAILED: Unexpected state (ID: c050)`, leaving pending writes unacknowledged. ([#10405](https://github.com/firebase/firebase-js-sdk/issues/10405))
