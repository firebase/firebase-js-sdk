---
'@firebase/remote-config': patch
---

Fixed Remote Config staying unable to read or write its IndexedDB storage for the lifetime of the page once its connection was closed (e.g. Safari closing the connections of a suspended tab) or failed to open. It now reopens the database instead of failing with "The database connection is closing".
