---
'@firebase/ai': patch
---

Fix a bug that caused `ChatSession.sendMessageStream()` and `TemplateChatSession.sendMessageStream()` to send duplicate user turns in the request.
