---
"@firebase/storage": patch
---

Fixed issue where if btoa wasn't supported in the environment, then the user would get a generic message.
