/**
 * @license
 * Copyright 2019 Google LLC
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

export function isSupported(): boolean {
  if (self && 'ServiceWorkerGlobalScope' in self) {
    // Running in ServiceWorker context
    return isSWControllerSupported();
  } else {
    // Assume we are in the window context.
    return isWindowControllerSupported();
  }
}

/**
 * Checks to see if the required APIs exist.
 */
function isWindowControllerSupported(): boolean {
  return (
    'indexedDB' in window &&
    indexedDB !== null &&
    navigator.cookieEnabled &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    'fetch' in window &&
    ServiceWorkerRegistration.prototype.hasOwnProperty('showNotification') &&
    PushSubscription.prototype.hasOwnProperty('getKey')
  );
}

/**
 * Checks to see if the required APIs exist within SW Context.
 */
function isSWControllerSupported(): boolean {
  return (
    'indexedDB' in self &&
    indexedDB !== null &&
    'PushManager' in self &&
    'Notification' in self &&
    ServiceWorkerRegistration.prototype.hasOwnProperty('showNotification') &&
    PushSubscription.prototype.hasOwnProperty('getKey')
  );
}
