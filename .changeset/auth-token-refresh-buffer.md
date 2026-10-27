---
'@firebase/auth': patch
---

Update the on-demand ID token expiration buffer (`Buffer.TOKEN_REFRESH`) from 30 seconds to 5 minutes to match `User.getIdToken()` documentation and the proactive refresh offset.
