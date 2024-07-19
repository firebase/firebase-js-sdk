---
'@firebase/app-compat': patch
---

Properly handle the case in app-compat checks where `window` exists but `self` does not. (This occurs in Ionic Stencil's Jest preset.)
