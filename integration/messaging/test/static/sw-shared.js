importScripts('/firebase/firebase-app.js');
importScripts('/firebase/firebase-messaging.js');

self.addEventListener('push', () => {
  self.registration.showNotification('[Debug Log] Message Received', {
    requiresInteraction: true,
  });
});
