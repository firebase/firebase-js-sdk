---
'@firebase/firestore': patch
'@firebase/util': patch
'firebase': patch
---

Modify base64 decoding logic to throw on invalid input, rather than silently truncating it.
