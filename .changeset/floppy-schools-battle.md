---
'@firebase/performance': patch
'firebase': patch
---

Modify the retry mechanism to stop when remaining tries is less than or equal to zero, improving the robustness of the retry handling.
