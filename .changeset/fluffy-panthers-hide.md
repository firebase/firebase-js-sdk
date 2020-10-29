---
'@firebase/messaging': patch
---

Adds a timeout for `onBackgroundMessage` hook so that silent-push warnings won't show if `showNotification` is called inside the hook within 1s.
This fixes the issue where the silent-push warning is displayed along with the message shown with [ServiceWorkerRegistration.showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification). 
