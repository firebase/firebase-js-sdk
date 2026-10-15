---
'@firebase/auth': patch
---

Only clear the persisted user during Auth initialization when the initial user reload fails with a user invalidation error (`auth/user-token-expired` or `auth/user-disabled`), preserving the session across transient server errors such as HTTP 5xx `UNAVAILABLE`.
