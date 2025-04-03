---
'@firebase/firestore': patch
'firebase': patch
---

Fix issue where Firestore would produce `undefined` for document snapshot data if using IndexedDB persistence and "clear site data" (or equivalent) button was pressed in the web browser.
