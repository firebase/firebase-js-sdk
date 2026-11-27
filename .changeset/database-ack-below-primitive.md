---
'@firebase/database': patch
'firebase': patch
---

Fix listeners keeping a stale primitive value after acknowledged writes below that primitive leave the server value empty ([#10686](https://github.com/firebase/firebase-js-sdk/issues/10686)).
