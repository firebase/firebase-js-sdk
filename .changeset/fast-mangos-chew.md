---
'@firebase/ai': patch
---

Pass `GenerativeModel`'s `BaseParams` to created chat sessions. This fixes an issue where `GenerationConfig` would not be inherited from `ChatSession`.
