---
'@firebase/firestore': patch
---

Revert fix for issue where Firestore would produce `undefined` for document snapshot if "clear site data" button was pressed in the web browser. This fix was introduced in v11.6.1 but inadvertantly caused issues for some customers (https://github.com/firebase/firebase-js-sdk/issues/9056).
