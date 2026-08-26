---
'@firebase/ai': patch
---

Fixed a client-side validation guardrail that incorrectly blocked `text/x.enum` when `responseSchema` or `responseJsonSchema` was provided. The SDK now correctly accepts both `application/json` and `text/x.enum` for structured outputs.
