---
'@firebase/app-check': patch
---

App Check now times out a shared token exchange after 60 seconds so later token requests can retry without a page reload.
