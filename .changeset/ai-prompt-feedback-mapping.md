---
'@firebase/ai': patch
'firebase': patch
---

Fixed an issue where `response.promptFeedback` was always `undefined` for `GoogleAIBackend` responses because the mapped prompt feedback was assigned to the wrong property.
