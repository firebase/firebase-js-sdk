---
'@firebase/ai': patch
---

Removed error logging in `ChatSession.sendMessageStream()`, since these errors are catchable.
