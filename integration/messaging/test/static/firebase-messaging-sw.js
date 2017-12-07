importScripts('/sw-shared.js');
importScripts('/valid-no-vapid-key/firebaseConfig.js');

firebase.initializeApp(self.firebaseConfig);

const messaging = firebase.messaging();
messaging.setBackgroundMessageHandler(data => {
  const title = 'Background Notification';
  return self.registration.showNotification(title, {});
});
