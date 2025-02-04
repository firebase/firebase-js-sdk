---
'@firebase/auth': patch
'firebase': patch
---

Fixed: invoking `connectAuthEmulator` mulitiple times with the same parameters will no longer cause
an error. Fixes [GitHub Issue #6824](https://github.com/firebase/firebase-js-sdk/issues/6824).

