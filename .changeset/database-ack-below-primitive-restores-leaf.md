---
'@firebase/database': patch
'firebase': patch
---

Fix listeners and `get()` staying at `null` instead of the server's primitive value after a write below that primitive was acknowledged following a rejected write at the same path ([#10687](https://github.com/firebase/firebase-js-sdk/issues/10687)).
