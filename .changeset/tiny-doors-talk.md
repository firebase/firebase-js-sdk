---
"@firebase/webchannel-wrapper": patch
"@firebase/firestore": patch
---
Increased the buffering-proxy detection timeout to minimize the false-positive rate. Updating WebChannel to ignore duplicate messages received from the server. Fix for https://github.com/firebase/firebase-js-sdk/issues/8250.
