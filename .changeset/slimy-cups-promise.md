---
'@firebase/functions-compat': patch
'@firebase/functions': patch
---

Remove node bundle from the functions SDK as the node-specific fetch code has been removed in favor of using native fetch throughout the SDK.
