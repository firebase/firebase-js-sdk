---
'@firebase/analytics': patch
'@firebase/util': patch
'firebase': patch
---

Fix error where an analytics PR included a change to `@firebase/util`, but
the util package was not properly included in the changeset for a patch bump.
