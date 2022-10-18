---
"@firebase/storage": patch
---

Fixed issue where clients using Node.js v18 would use the native `Blob` object which is incompatible with `node-fetch`
