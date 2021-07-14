---
'@firebase/app-types': patch
---

Add @firebase/logger as a dependency to @firebase/app-types to ensure that it can be resolved when compiling the package in a strict yarn PnP environment.
