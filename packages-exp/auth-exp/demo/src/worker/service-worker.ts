/**
 * @license
 * Copyright 2017 Google LLC
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
import { initializeApp } from '@firebase/app-exp';
import { getAuth } from '@firebase/auth-exp';
import { User } from '@firebase/auth-types-exp';

import { config } from '../config';

declare let self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/config.js',
  '/common.js',
  '/style.css'
];

// Initialize the Firebase app in the service worker.
const app = initializeApp(config);
const auth = getAuth(app);

/**
 * Returns a promise that resolves with an ID token if available.
 * @return {!Promise<?string>} The promise that resolves with an ID token if
 *     available. Otherwise, the promise resolves with null.
 */
function getIdToken(): Promise<string | null> {
  return new Promise(resolve => {
    auth.onAuthStateChanged((user: User | null) => {
      if (user) {
        user
          .getIdToken()
          .then(resolve)
          .catch(() => {
            resolve(null);
          });
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * @param {string} url The URL whose origin is to be returned.
 * @return {string} The origin corresponding to given URL.
 */
function getOriginFromUrl(url: string): string {
  // https://stackoverflow.com/questions/1420881/how-to-extract-base-url-from-a-string-in-javascript
  const pathArray = url.split('/');
  const protocol = pathArray[0];
  const host = pathArray[2];
  return protocol + '//' + host;
}

self.addEventListener('install', (event: ExtendableEvent) => {
  // Perform install steps.
  event.waitUntil(
    async (): Promise<void> => {
      const cache = await caches.open(CACHE_NAME);
      // Add all URLs of resources we want to cache.
      try {
        await cache.addAll(urlsToCache);
      } catch {
        // Suppress error as some of the files may not be available for the
        // current page.
      }
    }
  );
});

// As this is a test app, let's only return cached data when offline.
self.addEventListener('fetch', async (event: FetchEvent) => {
  // Try to fetch the resource first after checking for the ID token.
  const idToken = await getIdToken();
  let req = event.request;
  // For same origin https requests, append idToken to header.
  if (
    self.location.origin === getOriginFromUrl(event.request.url) &&
    (self.location.protocol === 'https:' ||
      self.location.hostname === 'localhost') &&
    idToken
  ) {
    // Clone headers as request headers are immutable.
    const headers = new Headers();
    req.headers.forEach((value, key) => {
      headers.append(key, value);
    });
    // Add ID token to header. We can't add to Authentication header as it
    // will break HTTP basic authentication.
    headers.append('x-id-token', idToken);
    try {
      req = new Request(req.url, {
        method: req.method,
        headers,
        mode: 'same-origin',
        credentials: req.credentials,
        cache: req.cache,
        redirect: req.redirect,
        referrer: req.referrer,
        body: req.body
      });
    } catch (e) {
      // This will fail for CORS requests. We just continue with the
      // fetch caching logic below and do not pass the ID token.
    }
  }
  let response: Response;
  try {
    response = await fetch(req);
  } catch (e) {
    // For fetch errors, attempt to retrieve the resource from cache.
    try {
      response = (await caches.match(event.request.clone()))!;
    } catch (error) {
      // If error getting resource from cache, do nothing.
      console.log(error);
      return;
    }
  }
  // Check if we received a valid response.
  // If not, just funnel the error response.
  if (!response || response.status !== 200 || response.type !== 'basic') {
    return response;
  }
  // If response is valid, clone it and save it to the cache.
  const responseToCache = response.clone();
  // Save response to cache.
  const cache = await caches.open(CACHE_NAME);
  await cache.put(event.request, responseToCache);
  // After caching, return response.
  return response;
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  // Update this list with all caches that need to remain cached.
  const cacheWhitelist = ['cache-v1'];
  event.waitUntil(
    async (): Promise<void> => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          // Check if cache is not whitelisted above.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // If not whitelisted, delete it.
            return caches.delete(cacheName);
          }
        })
      );
    }
  );
});
