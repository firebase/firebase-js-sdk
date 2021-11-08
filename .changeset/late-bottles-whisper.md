---
'@firebase/app-check': patch
---

Block exchange requests for certain periods of time after certain error codes to prevent overwhelming the endpoint. Start token listener when App Check is initialized to avoid extra wait time on first getToken() call.
