---
'@firebase/auth': minor
'@firebase/app': minor
---

Added `customIdentifier` to `FirebaseServerAppSettings`. This allows developers to isolate `FirebaseServerApp` instances per request (e.g. in SSR/Next.js) or force a fresh instance to retry after transient failures instead of reusing a cached instance.
