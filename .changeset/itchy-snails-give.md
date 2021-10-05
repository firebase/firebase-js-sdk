---
"@firebase/auth": patch
---

Fix bug in the `OAuthProvider.prototype.credential` method that was preventing the `rawNonce` field from being populated in the returned `OAuthCredential`.
