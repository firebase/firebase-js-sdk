---
'@firebase/firestore': patch
---

Fixed a bug where a rejected promise with an empty message in a transaction would cause a timeout.
