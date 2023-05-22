---
'@firebase/webchannel-wrapper': patch
---

Fix the new `experimentalLongPollingOptions.timeoutSeconds` setting, which was released in v9.22.0 but didn't work.
