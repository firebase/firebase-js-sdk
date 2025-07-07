---
'@firebase/firestore': patch
---

Further improved performance of UTF-8 string ordering logic, which had degraded in v11.3.0, was reverted in v11.3.1, and was re-introduced with some improvements in v11.5.0.
