---
'@firebase/remote-config': patch
---

Moved `calculateBackoffMillis()` exponential backoff function to util and have remote-config
import it from util.
