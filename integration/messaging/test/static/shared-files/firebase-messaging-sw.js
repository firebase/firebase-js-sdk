importScripts('/dist/browser/firebase-app.js');
importScripts('/dist/browser/firebase-messaging.js');

firebase.initializeApp({
  messagingSenderId: "153517668099"
});

const messaging = firebase.messaging();
messaging.setBackgroundMessageHandler(data => {
  const title = 'Background Notification';
  return self.registration.showNotification(title, {});
});
