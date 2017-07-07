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

import { WebSocketConnection } from "../realtime/WebSocketConnection";
import { BrowserPollConnection } from "../realtime/BrowserPollConnection";

/**
 * INTERNAL methods for internal-use only (tests, etc.).
 *
 * Customers shouldn't use these or else should be aware that they could break at any time.
 *
 * @const
 */

export const forceLongPolling = function() {
  WebSocketConnection.forceDisallow();
  BrowserPollConnection.forceAllow();
};

export const forceWebSockets = function() {
  BrowserPollConnection.forceDisallow();
};

/* Used by App Manager */
export const isWebSocketsAvailable = function() {
  return WebSocketConnection['isAvailable']();
};

export const setSecurityDebugCallback = function(ref, callback) {
  ref.repo.persistentConnection_.securityDebugCallback_ = callback;
};

export const stats = function(ref, showDelta) {
  ref.repo.stats(showDelta);
};

export const statsIncrementCounter = function(ref, metric) {
  ref.repo.statsIncrementCounter(metric);
};

export const dataUpdateCount = function(ref) {
  return ref.repo.dataUpdateCount;
};

export const interceptServerData = function(ref, callback) {
  return ref.repo.interceptServerData_(callback);
};
