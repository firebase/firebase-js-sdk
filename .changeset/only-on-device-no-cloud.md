---
'@firebase/ai': patch
---

Fixed `ONLY_ON_DEVICE` sending requests to the cloud when the environment has no `LanguageModel` API (for example, a browser without the built-in model). `generateContent()`, `generateContentStream()` and `countTokens()` now throw instead, as documented.
