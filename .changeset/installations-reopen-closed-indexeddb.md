---
'@firebase/installations': patch
---

Fixed Installations staying unable to use its IndexedDB storage for the lifetime of the page once its connection was closed (e.g. Safari closing the connections of a suspended tab) or failed to open. It now reopens the database instead of failing every `getId()` and `getToken()` call with "The database connection is closing".
