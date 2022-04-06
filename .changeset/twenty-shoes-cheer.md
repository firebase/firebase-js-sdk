---
"@firebase/database": patch
---

Fix websocketonly field to be set to true when using the websocket protocol (when using `wss` or `ws` in the RTDB URL, webSocketOnly will be true and longPolling will be disabled)
