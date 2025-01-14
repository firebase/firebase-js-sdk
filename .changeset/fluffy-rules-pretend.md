---
'@firebase/app-check': patch
'@firebase/util': patch
---

Generate UUIDs with `crypto.randomUUID()` instead of custom uuidv4 function that uses `Math.random()`.
