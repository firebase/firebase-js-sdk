---
'@firebase/ai': patch
'firebase': patch
---

Fixed an issue where `SafetyRating.blocked` was `undefined` instead of `false` when the rating did not block content.
