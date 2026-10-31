---
"@firebase/database": patch
"firebase": patch
---

Fix transactions becoming permanently stuck after overlapping writes cancel the same in-flight transaction more than once.
