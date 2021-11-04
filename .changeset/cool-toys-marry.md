---
"@firebase/functions": patch
---

Clear pending timeout after promise.race. It allows the process to exit immediately in case the SDK is used in Node.js, otherwise the process will wait for the timeout to finish before exiting. 
