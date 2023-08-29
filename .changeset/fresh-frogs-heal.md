---
"@firebase/firestore": patch
"@firebase/webchannel-wrapper": patch
---

Fix an [issue](https://github.com/firebase/firebase-js-sdk/issues/7581) where Firestore was incorrectly using XHR instead of fetch for streaming response.
