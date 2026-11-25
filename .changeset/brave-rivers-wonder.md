---
'@firebase/util': patch
---

Fixed `isCloudWorkstation()` comparing the URL scheme and host name case-sensitively. A mixed-case host such as `ABC.CloudWorkstations.dev` was not recognised, and an upper-case scheme caused the whole URL to be matched as if it were a host name.
