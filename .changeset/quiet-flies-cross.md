---
'@firebase/ai': major
'firebase': major
---

Refactored `Part` into a discriminated union with explicit `type` properties, introduced `UnknownPart` for raw wire and user-provided inputs, stripped `type` discriminators on wire egress, and ensured defensive deep copying for chat history.
