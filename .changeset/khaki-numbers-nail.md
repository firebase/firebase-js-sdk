---
'@firebase/auth': patch
'@firebase/util': minor
---

Suppress the use of the `fetch` parameter `referrerPolicy` within Auth for `fetch` requests originating from Cloudflare Workers. Clouldflare Worker environments do not support this parameter and throw when it's used.
