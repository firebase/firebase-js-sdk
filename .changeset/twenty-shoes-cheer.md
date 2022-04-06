---
"@firebase/database": patch
---

Fix websocketonly field to be set to true when using databaseURL (when using `wss` or `ws` in the RTDB URLs, webSocketOnly will be true and longPolling will be disabled)
