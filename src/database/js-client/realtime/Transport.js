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
goog.provide('fb.realtime.Transport');
goog.require('fb.core.RepoInfo');

/**
 *
 * @param {string} connId An identifier for this connection, used for logging
 * @param {fb.core.RepoInfo} repoInfo The info for the endpoint to send data to.
 * @param {string=} sessionId Optional sessionId if we're connecting to an existing session
 * @interface
 */
fb.realtime.Transport = function(connId, repoInfo, sessionId) {};

/**
 * @param {function(Object)} onMessage Callback when messages arrive
 * @param {function()} onDisconnect Callback with connection lost.
 */
fb.realtime.Transport.prototype.open = function(onMessage, onDisconnect) {};

fb.realtime.Transport.prototype.start = function() {};

fb.realtime.Transport.prototype.close = function() {};

/**
 * @param {!Object} data The JSON data to transmit
 */
fb.realtime.Transport.prototype.send = function(data) {};

/**
 * Bytes received since connection started.
 * @type {number}
 */
fb.realtime.Transport.prototype.bytesReceived;

/**
 * Bytes sent since connection started.
 * @type {number}
 */
fb.realtime.Transport.prototype.bytesSent;
