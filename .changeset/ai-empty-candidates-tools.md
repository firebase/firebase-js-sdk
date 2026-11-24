---
'@firebase/ai': patch
'firebase': patch
---

Fixed an issue where `ChatSession.sendMessage()` and `sendMessageStream()` threw a `TypeError` instead of logging the block warning when a prompt was blocked (empty `candidates`) and `tools` were set, or when `sendMessage()` received a candidate without `content`.
