---
'@firebase/messaging': patch
---

Revised token update logic to keep existing tokens during update failures, preventing unnecessary deletions for transient issues.
