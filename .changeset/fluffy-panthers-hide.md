---
'@firebase/messaging': patch
---

Fixed a bug where the silent-push warning is displayed along with the customized display notification when a message is received in the background. This was fixed by setting a timeout of 1s on the onBackgroundMessage hook to avoid false-positive silent pushes warnings. This timeout limit is derived from experiments to allow iterating through at least 1000 messages for [messsage collasping](https://developers.google.com/web/fundamentals/push-notifications/common-notification-patterns#merging_notifications) and other short-running tasks to complete before making a call to [ServiceWorkerRegistration.showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification). Developers should call [ServiceWorkerRegistration.showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification) at the beginning of any long-running onBackgroundMessage tasks. 
