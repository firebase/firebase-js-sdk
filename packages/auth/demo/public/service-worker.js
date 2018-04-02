/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Service worker for Firebase Auth test app application. The
 * service worker caches all content and only serves cached content in offline
 * mode.
 */

importScripts('/dist/firebase-app.js');
importScripts('/dist/firebase-auth.js');
importScripts('config.js');

// Initialize the Firebase app in the web worker.
firebase.initializeApp(config);

var CACHE_NAME = 'cache-v1';
var urlsToCache = [
  '/',
  '/manifest.json',
  '/config.js',
  '/script.js',
  '/common.js',
  '/style.css',
  '/dist/firebase-app.js',
  '/dist/firebase-auth.js',
  '/dist/firebase-database.js'
];

/**
 * Returns a promise that resolves with an ID token if available.
 * @return {!Promise<?string>} The promise that resolves with an ID token if
 *     available. Otherwise, the promise resolves with null.
 */
var getIdToken = function() {
  return new Promise(function(resolve, reject) {
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        user.getIdToken().then(function(idToken) {
          resolve(idToken);
        }, function(error) {
          resolve(null);
        });
      } else {
        resolve(null);
      }
    });
  }).catch(function(error) {
    console.log(error);
  });
};


/**
 * @param {string} url The URL whose origin is to be returned.
 * @return {string} The origin corresponding to given URL.
 */
var getOriginFromUrl = function(url) {
  // https://stackoverflow.com/questions/1420881/how-to-extract-base-url-from-a-string-in-javascript
  var pathArray = url.split('/');
  var protocol = pathArray[0];
  var host = pathArray[2];
  return protocol + '//' + host;
};


self.addEventListener('install', function(event) {
  // Perform install steps.
  event.waitUntil(caches.open(CACHE_NAME).then(function(cache) {
    // Add all URLs of resources we want to cache.
    return cache.addAll(urlsToCache)
        .catch(function(error) {
          // Suppress error as some of the files may not be available for the
          // current page.
        });
  }));
});

// As this is a test app, let's only return cached data when offline.
self.addEventListener('fetch', function(event) {
  var fetchEvent = event;
  var requestProcessor = function(idToken) {
    var req = event.request;
    // For same origin https requests, append idToken to header.
    if (self.location.origin == getOriginFromUrl(event.request.url) &&
       (self.location.protocol == 'https:' ||
        self.location.hostname == 'localhost') &&
       idToken) {
      // Clone headers as request headers are immutable.
      var headers = new Headers();
      for (var entry of req.headers.entries()) {
        headers.append(entry[0], entry[1]);
      }
      // Add ID token to header. We can't add to Authentication header as it
      // will break HTTP basic authentication.
      headers.append('x-id-token', idToken);
      try {
        req = new Request(req.url, {
          method: req.method,
          headers: headers,
          mode: 'same-origin',
          credentials: req.credentials,
          cache: req.cache,
          redirect: req.redirect,
          referrer: req.referrer,
          body: req.body,
          bodyUsed: req.bodyUsed,
          context: req.context
        });
      } catch (e) {
        // This will fail for CORS requests. We just continue with the
        // fetch caching logic below and do not pass the ID token.
      }
    }
    return fetch(req).then(function(response) {
      // Check if we received a valid response.
      // If not, just funnel the error response.
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }
      // If response is valid, clone it and save it to the cache.
      var responseToCache = response.clone();
      // Save response to cache.
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(fetchEvent.request, responseToCache);
      });
      // After caching, return response.
      return response;
    })
    .catch(function(error) {
      // For fetch errors, attempt to retrieve the resource from cache.
      return caches.match(fetchEvent.request.clone());
    })
    .catch(function(error) {
      // If error getting resource from cache, do nothing.
      console.log(error);
    });
  };
  // Try to fetch the resource first after checking for the ID token.
  event.respondWith(getIdToken().then(requestProcessor, requestProcessor));
});

self.addEventListener('activate', function(event) {
  // Update this list with all caches that need to remain cached.
  var cacheWhitelist = ['cache-v1'];
  event.waitUntil(caches.keys().then(function(cacheNames) {
    return Promise.all(cacheNames.map(function(cacheName) {
      // Check if cache is not whitelisted above.
      if (cacheWhitelist.indexOf(cacheName) === -1) {
        // If not whitelisted, delete it.
        return caches.delete(cacheName);
      }
    }));
  }));
});
