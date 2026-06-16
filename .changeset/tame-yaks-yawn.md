---
'@firebase/auth': patch
'@firebase/auth-compat': patch
---

Update referrer policy for auth API requests from no-referrer to strict-origin-when-cross-origin to support HTTP Referrer-restricted API keys in browser environments.
