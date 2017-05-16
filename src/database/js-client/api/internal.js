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
goog.provide('fb.api.INTERNAL');
goog.require('fb.core.PersistentConnection');
goog.require('fb.realtime.Connection');

/**
 * INTERNAL methods for internal-use only (tests, etc.).
 *
 * Customers shouldn't use these or else should be aware that they could break at any time.
 *
 * @const
 */
fb.api.INTERNAL = {};


fb.api.INTERNAL.forceLongPolling = function() {
  fb.realtime.WebSocketConnection.forceDisallow();
  fb.realtime.BrowserPollConnection.forceAllow();
};
goog.exportProperty(fb.api.INTERNAL, 'forceLongPolling', fb.api.INTERNAL.forceLongPolling);

fb.api.INTERNAL.forceWebSockets = function() {
  fb.realtime.BrowserPollConnection.forceDisallow();
};
goog.exportProperty(fb.api.INTERNAL, 'forceWebSockets', fb.api.INTERNAL.forceWebSockets);

/* Used by App Manager */
fb.api.INTERNAL.isWebSocketsAvailable = function() {
  return fb.realtime.WebSocketConnection['isAvailable']();
};
goog.exportProperty(fb.api.INTERNAL, 'isWebSocketsAvailable', fb.api.INTERNAL.isWebSocketsAvailable);

fb.api.INTERNAL.setSecurityDebugCallback = function(ref, callback) {
  ref.repo.persistentConnection_.securityDebugCallback_ = callback;
};
goog.exportProperty(fb.api.INTERNAL, 'setSecurityDebugCallback', fb.api.INTERNAL.setSecurityDebugCallback);

fb.api.INTERNAL.stats = function(ref, showDelta) {
  ref.repo.stats(showDelta);
};
goog.exportProperty(fb.api.INTERNAL, 'stats', fb.api.INTERNAL.stats);

fb.api.INTERNAL.statsIncrementCounter = function(ref, metric) {
  ref.repo.statsIncrementCounter(metric);
};
goog.exportProperty(fb.api.INTERNAL, 'statsIncrementCounter', fb.api.INTERNAL.statsIncrementCounter);

fb.api.INTERNAL.dataUpdateCount = function(ref) {
  return ref.repo.dataUpdateCount;
};
goog.exportProperty(fb.api.INTERNAL, 'dataUpdateCount', fb.api.INTERNAL.dataUpdateCount);

fb.api.INTERNAL.interceptServerData = function(ref, callback) {
  return ref.repo.interceptServerData_(callback);
};
goog.exportProperty(fb.api.INTERNAL, 'interceptServerData', fb.api.INTERNAL.interceptServerData);
