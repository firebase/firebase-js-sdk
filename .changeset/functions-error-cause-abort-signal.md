---
'@firebase/functions': minor
'firebase': minor
---

Preserve the underlying `fetch` / stream error as `cause` on `FunctionsError` when a callable request fails, and add `signal?: AbortSignal` support to `HttpsCallableOptions`.
