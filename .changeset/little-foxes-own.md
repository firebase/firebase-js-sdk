---
"@firebase/rules-unit-testing": patch
---

Set RTDB namespace to be same as projectId by default instead of `${projectId}-default-rtdb`. This fixes rules not being applied and other issues related to namespace mismatch.
