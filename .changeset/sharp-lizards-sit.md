---
'@firebase/firestore': patch
'firebase': patch
---

Reduce code bundle size by 6.5 kB in applications that only use memory persistence (the default persistence mode). This bundle size regression was accidentally introduced in v10.7.2.
