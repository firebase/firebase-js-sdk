importScripts('../../../dist/package/firebase-app.js');

addEventListener('install', function(event) {
  // Dynamically load the latest service-worker (w/o reloading or closing
  // the current open tabs).
  event.waitUntil(self.skipWaiting());
});

addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});

addEventListener('fetch', function(event) {
  if (event.request.url.endsWith('/SDK_VERSION')) {
    const res = new Response(JSON.stringify(firebase.SDK_VERSION), {
      headers: {'Content-Type': 'application/json'}
    });
    event.respondWith(res);
  }
});
