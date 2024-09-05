---
'@firebase/auth': minor
'@firebase/util': minor
'firebase': minor
---

Suppress the use of the `fetch` parameter `referrPolicy` within Auth for `fetch` requests originating from Cloudflare Workers. Clouldflare Worker environments do not support this parameter and throw when it's used.
