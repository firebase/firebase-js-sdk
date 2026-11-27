---
'@firebase/database': patch
'firebase': patch
---

Fixed an issue where `update()` that removed the last child of a node with a priority and added another child dropped the priority in the local cache, so listeners and `get()` saw the node without it. ([#10688](https://github.com/firebase/firebase-js-sdk/issues/10688))
