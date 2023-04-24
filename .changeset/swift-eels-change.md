---
'@firebase/webchannel-wrapper': minor
'@firebase/firestore': minor
'firebase': minor
---

Implemented an optimization in the local cache synchronization logic that reduces the number of billed document reads when documents were deleted on the server while the client was not actively listening to the query (e.g. while the client was offline).
