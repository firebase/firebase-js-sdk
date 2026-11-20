---
'@firebase/ai': patch
---

Fix a bug in `GoogleAIBackend` response mapping where a candidate without `safetyRatings` inherited the previous candidate's `safetyRatings` when `candidateCount > 1`.
