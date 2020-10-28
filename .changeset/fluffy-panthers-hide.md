---
'@firebase/messaging': patch
---

Sets a timeout of 1s on the onBackgroundMessage hook to avoid false-positive silent pushes warnings. This timeout limit is derived from experiments to allow [messsage collasping](https://developers.google.com/web/fundamentals/push-notifications/common-notification-patterns#merging_notifications) and other short-running tasks to complete before making a call to [ServiceWorkerRegistration.showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification). Developers should refine from executing long-running tasks in this callback.
