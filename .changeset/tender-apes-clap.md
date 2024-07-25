---
'@firebase/analytics': patch
'@firebase/app-check': patch
---

Revert introduction of safevalues to prevent issues from arising in Browser CommonJS environments due to ES5 incompatibility. For more information, see [GitHub PR #8395](https://github.com/firebase/firebase-js-sdk/pull/8395)
