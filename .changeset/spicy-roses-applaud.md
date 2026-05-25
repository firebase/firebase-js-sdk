---
'@firebase/app-check': patch
---

Fix a bug where `getLimitedUseToken()` did not correctly get a limited use token because it did not send the `limited_use` param.