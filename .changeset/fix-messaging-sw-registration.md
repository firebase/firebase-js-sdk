---
'@firebase/messaging': patch
---

Fix "Cannot read properties of undefined (reading 'pushManager')" in the service worker by initializing `swRegistration` from `self.registration` when the messaging instance is created in the service worker context.
