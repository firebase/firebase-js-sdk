---
'@firebase/ai': patch
'firebase': patch
---

Fixed `sendMessageStream()` automatic function calling missing function calls that arrive after the first streamed chunk, such as calls that follow a thought or parallel calls split across chunks.
