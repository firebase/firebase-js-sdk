---
'@firebase/messaging': patch
'firebase': patch
---

Fixed `register()` not re-registering with FCM when a different `vapidKey` is passed within the weekly refresh window. Also fixed `register()` and `getToken()` reusing an existing push subscription that was created with a different VAPID key; it is now unsubscribed and re-created with the requested key.
