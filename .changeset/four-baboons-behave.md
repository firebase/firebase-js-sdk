---
'@firebase/vertexai': patch
---

Clear fetch timeout after request completion. Fixes an issue that caused Node scripts to hang due to a pending timeout.
