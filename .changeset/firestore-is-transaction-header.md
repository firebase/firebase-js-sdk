---
'@firebase/firestore': patch
'firebase': patch
---

Add the `x-goog-is-transaction` routing header to Firestore gRPC and REST requests to indicate whether an RPC is executed as part of a transaction.
