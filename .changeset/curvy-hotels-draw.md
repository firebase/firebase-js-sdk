---
'firebase': minor
'@firebase/firestore': minor
---

Changed the HTTP/2 flow control window size from 64 KB to 256 KB, and added a `grpcFlowControlWindow` configuration option to `FirestoreSettings`. This change is only applicable to Node environments.
