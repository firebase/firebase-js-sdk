---
'@firebase/database': patch
---

get()s issued for queries that are being listened to no longer send backend requests.
