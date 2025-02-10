---
'@firebase/firestore': patch
'firebase': patch
---

Reverted a change to use UTF-8 encoding in string comparisons which caused a performance issue.
