---
"@firebase/storage": patch
---

Clear the global timeout once an operation is done in the Storage SDK. Otherwise it may prevent Node.js from exiting.
