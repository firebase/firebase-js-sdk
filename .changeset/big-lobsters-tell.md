---
'@firebase/storage': patch
---

Change `ref()` to not throw if given a path with '..' in it.
