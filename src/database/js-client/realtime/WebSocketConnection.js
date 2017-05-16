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
goog.provide('fb.realtime.WebSocketConnection');
goog.require('fb.constants');
goog.require('fb.core.stats.StatsManager');
goog.require('fb.core.storage');
goog.require('fb.core.util');
goog.require('fb.realtime.Constants');
goog.require('fb.realtime.Transport');
goog.require('fb.util.json');

var WEBSOCKET_MAX_FRAME_SIZE = 16384;
var WEBSOCKET_KEEPALIVE_INTERVAL = 45000;

fb.WebSocket = null;
if (fb.login.util.environment.isNodeSdk()) {
  goog.require('fb.core.util.NodePatches');
  fb.WebSocket = require('faye-websocket')['Client'];
} else if (typeof MozWebSocket !== 'undefined') {
  fb.WebSocket = MozWebSocket;
} else if (typeof WebSocket !== 'undefined') {
  fb.WebSocket = WebSocket;
}

/**
 * Create a new websocket connection with the given callbacks.
 * @constructor
 * @implements {fb.realtime.Transport}
 * @param {string} connId identifier for this transport
 * @param {fb.core.RepoInfo} repoInfo The info for the websocket endpoint.
 * @param {string=} opt_transportSessionId Optional transportSessionId if this is connecting to an existing transport
 *                                         session
 * @param {string=} opt_lastSessionId Optional lastSessionId if there was a previous connection
 */
fb.realtime.WebSocketConnection = function(connId, repoInfo, opt_transportSessionId, opt_lastSessionId) {
  this.connId = connId;
  this.log_ = fb.core.util.logWrapper(this.connId);
  this.keepaliveTimer = null;
  this.frames = null;
  this.totalFrames = 0;
  this.bytesSent = 0;
  this.bytesReceived = 0;
  this.stats_ = fb.core.stats.StatsManager.getCollection(repoInfo);
  this.connURL = this.connectionURL_(repoInfo, opt_transportSessionId, opt_lastSessionId);
};


/**
 * @param {fb.core.RepoInfo} repoInfo The info for the websocket endpoint.
 * @param {string=} opt_transportSessionId Optional transportSessionId if this is connecting to an existing transport
 *                                         session
 * @param {string=} opt_lastSessionId Optional lastSessionId if there was a previous connection
 * @return {string} connection url
 * @private
 */
fb.realtime.WebSocketConnection.prototype.connectionURL_ = function(repoInfo, opt_transportSessionId,
                                                                    opt_lastSessionId) {
  var urlParams = {};
  urlParams[fb.realtime.Constants.VERSION_PARAM] = fb.realtime.Constants.PROTOCOL_VERSION;

  if (!fb.login.util.environment.isNodeSdk() &&
      typeof location !== 'undefined' &&
      location.href &&
      location.href.indexOf(fb.realtime.Constants.FORGE_DOMAIN) !== -1) {
    urlParams[fb.realtime.Constants.REFERER_PARAM] = fb.realtime.Constants.FORGE_REF;
  }
  if (opt_transportSessionId) {
    urlParams[fb.realtime.Constants.TRANSPORT_SESSION_PARAM] = opt_transportSessionId;
  }
  if (opt_lastSessionId) {
    urlParams[fb.realtime.Constants.LAST_SESSION_PARAM] = opt_lastSessionId;
  }
  return repoInfo.connectionURL(fb.realtime.Constants.WEBSOCKET, urlParams);
};


/**
 *
 * @param onMess Callback when messages arrive
 * @param onDisconn Callback with connection lost.
 */
fb.realtime.WebSocketConnection.prototype.open = function(onMess, onDisconn) {
  this.onDisconnect = onDisconn;
  this.onMessage = onMess;

  this.log_('Websocket connecting to ' + this.connURL);

  this.everConnected_ = false;
  // Assume failure until proven otherwise.
  fb.core.storage.PersistentStorage.set('previous_websocket_failure', true);

  try {
    if (fb.login.util.environment.isNodeSdk()) {
      var device = fb.constants.NODE_ADMIN ? 'AdminNode' : 'Node';
      // UA Format: Firebase/<wire_protocol>/<sdk_version>/<platform>/<device>
      var options = {
        'headers': {
          'User-Agent': 'Firebase/' + fb.realtime.Constants.PROTOCOL_VERSION + '/' + firebase.SDK_VERSION + '/' + process.platform + '/' + device
      }};

      // Plumb appropriate http_proxy environment variable into faye-websocket if it exists.
      var env = process['env'];
      var proxy = (this.connURL.indexOf("wss://") == 0)
          ? (env['HTTPS_PROXY'] || env['https_proxy'])
          : (env['HTTP_PROXY']  || env['http_proxy']);

      if (proxy) {
        options['proxy'] = { origin: proxy };
      }

      this.mySock = new fb.WebSocket(this.connURL, [], options);
    }
    else {
      this.mySock = new fb.WebSocket(this.connURL);
    }
  } catch (e) {
    this.log_('Error instantiating WebSocket.');
    var error = e.message || e.data;
    if (error) {
      this.log_(error);
    }
    this.onClosed_();
    return;
  }

  var self = this;

  this.mySock.onopen = function() {
    self.log_('Websocket connected.');
    self.everConnected_ = true;
  };

  this.mySock.onclose = function() {
    self.log_('Websocket connection was disconnected.');
    self.mySock = null;
    self.onClosed_();
  };

  this.mySock.onmessage = function(m) {
    self.handleIncomingFrame(m);
  };

  this.mySock.onerror = function(e) {
    self.log_('WebSocket error.  Closing connection.');
    var error = e.message || e.data;
    if (error) {
      self.log_(error);
    }
    self.onClosed_();
  };
};

/**
 * No-op for websockets, we don't need to do anything once the connection is confirmed as open
 */
fb.realtime.WebSocketConnection.prototype.start = function() {};


fb.realtime.WebSocketConnection.forceDisallow = function() {
  fb.realtime.WebSocketConnection.forceDisallow_ = true;
};


fb.realtime.WebSocketConnection['isAvailable'] = function() {
  var isOldAndroid = false;
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    var oldAndroidRegex = /Android ([0-9]{0,}\.[0-9]{0,})/;
    var oldAndroidMatch = navigator.userAgent.match(oldAndroidRegex);
    if (oldAndroidMatch && oldAndroidMatch.length > 1) {
      if (parseFloat(oldAndroidMatch[1]) < 4.4) {
        isOldAndroid = true;
      }
    }
  }

  return !isOldAndroid && fb.WebSocket !== null && !fb.realtime.WebSocketConnection.forceDisallow_;
};

/**
 * Number of response before we consider the connection "healthy."
 * @type {number}
 *
 * NOTE: 'responsesRequiredToBeHealthy' shouldn't need to be quoted, but closure removed it for some reason otherwise!
 */
fb.realtime.WebSocketConnection['responsesRequiredToBeHealthy'] = 2;

/**
 * Time to wait for the connection te become healthy before giving up.
 * @type {number}
 *
 *  NOTE: 'healthyTimeout' shouldn't need to be quoted, but closure removed it for some reason otherwise!
 */
fb.realtime.WebSocketConnection['healthyTimeout'] = 30000;

/**
 * Returns true if we previously failed to connect with this transport.
 * @return {boolean}
 */
fb.realtime.WebSocketConnection.previouslyFailed = function() {
  // If our persistent storage is actually only in-memory storage,
  // we default to assuming that it previously failed to be safe.
  return fb.core.storage.PersistentStorage.isInMemoryStorage ||
         fb.core.storage.PersistentStorage.get('previous_websocket_failure') === true;
};

fb.realtime.WebSocketConnection.prototype.markConnectionHealthy = function() {
  fb.core.storage.PersistentStorage.remove('previous_websocket_failure');
};

fb.realtime.WebSocketConnection.prototype.appendFrame_ = function(data) {
  this.frames.push(data);
  if (this.frames.length == this.totalFrames) {
    var fullMess = this.frames.join('');
    this.frames = null;
    var jsonMess = fb.util.json.eval(fullMess);

    //handle the message
    this.onMessage(jsonMess);
  }
};

/**
 * @param {number} frameCount The number of frames we are expecting from the server
 * @private
 */
fb.realtime.WebSocketConnection.prototype.handleNewFrameCount_ = function(frameCount) {
  this.totalFrames = frameCount;
  this.frames = [];
};

/**
 * Attempts to parse a frame count out of some text. If it can't, assumes a value of 1
 * @param {!String} data
 * @return {?String} Any remaining data to be process, or null if there is none
 * @private
 */
fb.realtime.WebSocketConnection.prototype.extractFrameCount_ = function(data) {
  fb.core.util.assert(this.frames === null, 'We already have a frame buffer');
  // TODO: The server is only supposed to send up to 9999 frames (i.e. length <= 4), but that isn't being enforced
  // currently.  So allowing larger frame counts (length <= 6).  See https://app.asana.com/0/search/8688598998380/8237608042508
  if (data.length <= 6) {
    var frameCount = Number(data);
    if (!isNaN(frameCount)) {
      this.handleNewFrameCount_(frameCount);
      return null;
    }
  }
  this.handleNewFrameCount_(1);
  return data;
};

/**
 * Process a websocket frame that has arrived from the server.
 * @param mess The frame data
 */
fb.realtime.WebSocketConnection.prototype.handleIncomingFrame = function(mess) {
  if (this.mySock === null)
    return; // Chrome apparently delivers incoming packets even after we .close() the connection sometimes.
  var data = mess['data'];
  this.bytesReceived += data.length;
  this.stats_.incrementCounter('bytes_received', data.length);

  this.resetKeepAlive();

  if (this.frames !== null) {
    // we're buffering
    this.appendFrame_(data);
  } else {
    // try to parse out a frame count, otherwise, assume 1 and process it
    var remainingData = this.extractFrameCount_(data);
    if (remainingData !== null) {
      this.appendFrame_(remainingData);
    }
  }
};

/**
 * Send a message to the server
 * @param {Object} data The JSON object to transmit
 */
fb.realtime.WebSocketConnection.prototype.send = function(data) {

  this.resetKeepAlive();

  var dataStr = fb.util.json.stringify(data);
  this.bytesSent += dataStr.length;
  this.stats_.incrementCounter('bytes_sent', dataStr.length);

  //We can only fit a certain amount in each websocket frame, so we need to split this request
  //up into multiple pieces if it doesn't fit in one request.

  var dataSegs = fb.core.util.splitStringBySize(dataStr, WEBSOCKET_MAX_FRAME_SIZE);

  //Send the length header
  if (dataSegs.length > 1) {
    this.sendString_(String(dataSegs.length));
  }

  //Send the actual data in segments.
  for (var i = 0; i < dataSegs.length; i++) {
    this.sendString_(dataSegs[i]);
  }
};

fb.realtime.WebSocketConnection.prototype.shutdown_ = function() {
  this.isClosed_ = true;
  if (this.keepaliveTimer) {
    clearInterval(this.keepaliveTimer);
    this.keepaliveTimer = null;
  }

  if (this.mySock) {
    this.mySock.close();
    this.mySock = null;
  }
};

fb.realtime.WebSocketConnection.prototype.onClosed_ = function() {
  if (!this.isClosed_) {
    this.log_('WebSocket is closing itself');
    this.shutdown_();

    // since this is an internal close, trigger the close listener
    if (this.onDisconnect) {
      this.onDisconnect(this.everConnected_);
      this.onDisconnect = null;
    }
  }
};

/**
 * External-facing close handler.
 * Close the websocket and kill the connection.
 */
fb.realtime.WebSocketConnection.prototype.close = function() {
  if (!this.isClosed_) {
    this.log_('WebSocket is being closed');
    this.shutdown_();
  }
};

/**
 * Kill the current keepalive timer and start a new one, to ensure that it always fires N seconds after
 * the last activity.
 */
fb.realtime.WebSocketConnection.prototype.resetKeepAlive = function() {
  var self = this;
  clearInterval(this.keepaliveTimer);
  this.keepaliveTimer = setInterval(function() {
    //If there has been no websocket activity for a while, send a no-op
    if (self.mySock) {
      self.sendString_('0');
    }
    self.resetKeepAlive();
  }, Math.floor(WEBSOCKET_KEEPALIVE_INTERVAL));
};

/**
 * Send a string over the websocket.
 *
 * @param {string} str String to send.
 * @private
 */
fb.realtime.WebSocketConnection.prototype.sendString_ = function(str) {
  // Firefox seems to sometimes throw exceptions (NS_ERROR_UNEXPECTED) from websocket .send()
  // calls for some unknown reason.  We treat these as an error and disconnect.
  // See https://app.asana.com/0/58926111402292/68021340250410
  try {
    this.mySock.send(str);
  } catch (e) {
    this.log_('Exception thrown from WebSocket.send():', e.message || e.data, 'Closing connection.');
    setTimeout(goog.bind(this.onClosed_, this), 0);
  }
};
