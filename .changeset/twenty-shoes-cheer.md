---
"@firebase/database": patch
---

Fix issue where if a websocket protocol was used in the databaseURL, `webSocketOnly` field was incorrectly set to undefined. (When using `wss` or `ws` protocols in the databaseURL, webSocketOnly will be true and longPolling will be disabled)
