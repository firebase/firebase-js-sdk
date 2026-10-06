---
'@firebase/auth': patch
---

Preserve the persisted user during Auth initialization when the initial user reload fails due to a transient quota (`auth/quota-exceeded`) or rate-limit (`auth/too-many-requests`) error.
