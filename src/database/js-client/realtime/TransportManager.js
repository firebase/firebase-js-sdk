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
goog.require('fb.constants');
goog.require('fb.realtime.BrowserPollConnection');
goog.require('fb.realtime.Transport');
goog.provide('fb.realtime.TransportManager');
goog.require('fb.realtime.WebSocketConnection');

/**
 * Currently simplistic, this class manages what transport a Connection should use at various stages of its
 * lifecycle.
 *
 * It starts with longpolling in a browser, and httppolling on node. It then upgrades to websockets if
 * they are available.
 * @constructor
 * @param {!fb.core.RepoInfo} repoInfo Metadata around the namespace we're connecting to
 */
fb.realtime.TransportManager = function(repoInfo) {
  this.initTransports_(repoInfo);
};

/**
 * @const
 * @type {!Array.<function(new:fb.realtime.Transport, string, fb.core.RepoInfo, string=)>}
 */
fb.realtime.TransportManager.ALL_TRANSPORTS = [
  fb.realtime.BrowserPollConnection,
  fb.realtime.WebSocketConnection
];

/**
 * @param {!fb.core.RepoInfo} repoInfo
 * @private
 */
fb.realtime.TransportManager.prototype.initTransports_ = function(repoInfo) {
  var isWebSocketsAvailable = fb.realtime.WebSocketConnection && fb.realtime.WebSocketConnection['isAvailable']();
  var isSkipPollConnection = isWebSocketsAvailable && !fb.realtime.WebSocketConnection.previouslyFailed();

  if (repoInfo.webSocketOnly) {
    if (!isWebSocketsAvailable)
      fb.core.util.warn('wss:// URL used, but browser isn\'t known to support websockets.  Trying anyway.');

    isSkipPollConnection = true;
  }

  if (isSkipPollConnection) {
    this.transports_ = [fb.realtime.WebSocketConnection];
  } else {
    var transports = this.transports_ = [];
    fb.core.util.each(fb.realtime.TransportManager.ALL_TRANSPORTS, function(i, transport) {
      if (transport && transport['isAvailable']()) {
        transports.push(transport);
      }
    });
  }
};

/**
 * @return {function(new:fb.realtime.Transport, !string, !fb.core.RepoInfo, string=, string=)} The constructor for the
 * initial transport to use
 */
fb.realtime.TransportManager.prototype.initialTransport = function() {
  if (this.transports_.length > 0) {
    return this.transports_[0];
  } else {
    throw new Error('No transports available');
  }
};

/**
 * @return {?function(new:fb.realtime.Transport, function(),function(), string=)} The constructor for the next
 * transport, or null
 */
fb.realtime.TransportManager.prototype.upgradeTransport = function() {
  if (this.transports_.length > 1) {
    return this.transports_[1];
  } else {
    return null;
  }
};
