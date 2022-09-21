---
'@firebase/app-check': patch
---

Fix timer issues in App Check that caused the token to fail to refresh after the token expired, or caused rapid repeated requests attempting to do so.
