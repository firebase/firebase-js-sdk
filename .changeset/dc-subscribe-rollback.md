---
'@firebase/data-connect': patch
---

Fix a bug where a query subscription whose initial transport connection failed was left registered, causing later subscriptions to the same query to never reach the transport.
