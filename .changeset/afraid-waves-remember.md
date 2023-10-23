---
"@firebase/auth": patch
---

Fix FetchProvider in non-browser environments, by trying to get the `fetch` implementation from not only `self` but also standard `globalThis`.
