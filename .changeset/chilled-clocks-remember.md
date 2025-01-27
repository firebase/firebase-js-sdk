---
"@firebase/database": patch
---

Fix a potential for a negative offset when calculating last reconnect times. This could cause lengthy reconnect delays in some scenarios. Fixes #8718.
