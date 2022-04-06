---
"@firebase/database": patch
---

Fix `webSocketOnly` field to be set to true in `RepoInfo` when using the websocket protocol in the databaseURL in firebase configuration (when using `wss` or `ws` in the RTDB URL, webSocketOnly will be true and longPolling will be disabled)
