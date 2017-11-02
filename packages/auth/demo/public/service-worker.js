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
  // Try to fetch the resource first.
  event.respondWith(fetch(event.request)
    .then(function(response) {
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
    })
  );
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
