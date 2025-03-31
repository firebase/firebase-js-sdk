---
'firebase': minor
'@firebase/auth': minor
---

Adding `Persistence.COOKIE` a new persistence method backed by cookies. The
`browserCookiePersistence` implementation is designed to be used in conjunction with middleware that
ensures both your front and backend authentication state remains synchronized.
