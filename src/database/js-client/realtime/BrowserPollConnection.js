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
goog.provide('fb.realtime.BrowserPollConnection');
goog.require('fb.constants');
goog.require('fb.core.stats.StatsManager');
goog.require('fb.core.util');
goog.require('fb.core.util.CountedSet');
goog.require('fb.realtime.Constants');
goog.require('fb.realtime.Transport');
goog.require('fb.realtime.polling.PacketReceiver');
goog.require('fb.util.json');

// URL query parameters associated with longpolling
// TODO: move more of these out of the global namespace
var FIREBASE_LONGPOLL_START_PARAM = 'start';
var FIREBASE_LONGPOLL_CLOSE_COMMAND = 'close';
var FIREBASE_LONGPOLL_COMMAND_CB_NAME = 'pLPCommand';
var FIREBASE_LONGPOLL_DATA_CB_NAME = 'pRTLPCB';
var FIREBASE_LONGPOLL_ID_PARAM = 'id';
var FIREBASE_LONGPOLL_PW_PARAM = 'pw';
var FIREBASE_LONGPOLL_SERIAL_PARAM = 'ser';
var FIREBASE_LONGPOLL_CALLBACK_ID_PARAM = 'cb';
var FIREBASE_LONGPOLL_SEGMENT_NUM_PARAM = 'seg';
var FIREBASE_LONGPOLL_SEGMENTS_IN_PACKET = 'ts';
var FIREBASE_LONGPOLL_DATA_PARAM = 'd';
var FIREBASE_LONGPOLL_DISCONN_FRAME_PARAM = 'disconn';
var FIREBASE_LONGPOLL_DISCONN_FRAME_REQUEST_PARAM = 'dframe';

//Data size constants.
//TODO: Perf: the maximum length actually differs from browser to browser.
// We should check what browser we're on and set accordingly.
var MAX_URL_DATA_SIZE = 1870;
var SEG_HEADER_SIZE = 30; //ie: &seg=8299234&ts=982389123&d=
var MAX_PAYLOAD_SIZE = MAX_URL_DATA_SIZE - SEG_HEADER_SIZE;

/**
 * Keepalive period
 * send a fresh request at minimum every 25 seconds. Opera has a maximum request
 * length of 30 seconds that we can't exceed.
 * @const
 * @type {number}
 */
var KEEPALIVE_REQUEST_INTERVAL = 25000;

/**
 * How long to wait before aborting a long-polling connection attempt.
 * @const
 * @type {number}
 */
var LP_CONNECT_TIMEOUT = 30000;

/**
 * This class manages a single long-polling connection.
 *
 * @constructor
 * @implements {fb.realtime.Transport}
 * @param {string} connId An identifier for this connection, used for logging
 * @param {fb.core.RepoInfo} repoInfo The info for the endpoint to send data to.
 * @param {string=} opt_transportSessionId Optional transportSessionid if we are reconnecting for an existing
 *                                         transport session
 * @param {string=}  opt_lastSessionId Optional lastSessionId if the PersistentConnection has already created a
 *                                     connection previously
 */
fb.realtime.BrowserPollConnection = function(connId, repoInfo, opt_transportSessionId, opt_lastSessionId) {
  this.connId = connId;
  this.log_ = fb.core.util.logWrapper(connId);
  this.repoInfo = repoInfo;
  this.bytesSent = 0;
  this.bytesReceived = 0;
  this.stats_ = fb.core.stats.StatsManager.getCollection(repoInfo);
  this.transportSessionId = opt_transportSessionId;
  this.everConnected_ = false;
  this.lastSessionId = opt_lastSessionId;
  this.urlFn = function(params) {
    return repoInfo.connectionURL(fb.realtime.Constants.LONG_POLLING, params);
  };
};

/**
 *
 * @param {function(Object)} onMessage Callback when messages arrive
 * @param {function()} onDisconnect Callback with connection lost.
 */
fb.realtime.BrowserPollConnection.prototype.open = function(onMessage, onDisconnect) {
  this.curSegmentNum = 0;
  this.onDisconnect_ = onDisconnect;
  this.myPacketOrderer = new fb.realtime.polling.PacketReceiver(onMessage);
  this.isClosed_ = false;
  var self = this;

  this.connectTimeoutTimer_ = setTimeout(function() {
    self.log_('Timed out trying to connect.');
    // Make sure we clear the host cache
    self.onClosed_();
    self.connectTimeoutTimer_ = null;
  }, Math.floor(LP_CONNECT_TIMEOUT));

  // Ensure we delay the creation of the iframe until the DOM is loaded.
  fb.core.util.executeWhenDOMReady(function() {
    if (self.isClosed_)
      return;

    //Set up a callback that gets triggered once a connection is set up.
    self.scriptTagHolder = new FirebaseIFrameScriptHolder(function(command, arg1, arg2, arg3, arg4) {
      self.incrementIncomingBytes_(arguments);
      if (!self.scriptTagHolder)
        return; // we closed the connection.

      if (self.connectTimeoutTimer_) {
        clearTimeout(self.connectTimeoutTimer_);
        self.connectTimeoutTimer_ = null;
      }
      self.everConnected_ = true;
      if (command == FIREBASE_LONGPOLL_START_PARAM) {
        self.id = arg1;
        self.password = arg2;
      } else if (command === FIREBASE_LONGPOLL_CLOSE_COMMAND) {
        // Don't clear the host cache. We got a response from the server, so we know it's reachable
        if (arg1) {
          // We aren't expecting any more data (other than what the server's already in the process of sending us
          // through our already open polls), so don't send any more.
          self.scriptTagHolder.sendNewPolls = false;

          // arg1 in this case is the last response number sent by the server. We should try to receive
          // all of the responses up to this one before closing
          self.myPacketOrderer.closeAfter(arg1, function() { self.onClosed_(); });
        } else {
          self.onClosed_();
        }
      } else {
        throw new Error('Unrecognized command received: ' + command);
      }
    }, function(pN, data) {
      self.incrementIncomingBytes_(arguments);
      self.myPacketOrderer.handleResponse(pN, data);
    }, function() {
      self.onClosed_();
    }, self.urlFn);

    //Send the initial request to connect. The serial number is simply to keep the browser from pulling previous results
    //from cache.
    var urlParams = {};
    urlParams[FIREBASE_LONGPOLL_START_PARAM] = 't';
    urlParams[FIREBASE_LONGPOLL_SERIAL_PARAM] = Math.floor(Math.random() * 100000000);
    if (self.scriptTagHolder.uniqueCallbackIdentifier)
      urlParams[FIREBASE_LONGPOLL_CALLBACK_ID_PARAM] = self.scriptTagHolder.uniqueCallbackIdentifier;
    urlParams[fb.realtime.Constants.VERSION_PARAM] = fb.realtime.Constants.PROTOCOL_VERSION;
    if (self.transportSessionId) {
      urlParams[fb.realtime.Constants.TRANSPORT_SESSION_PARAM] = self.transportSessionId;
    }
    if (self.lastSessionId) {
      urlParams[fb.realtime.Constants.LAST_SESSION_PARAM] = self.lastSessionId;
    }
    if (!fb.login.util.environment.isNodeSdk() &&
      typeof location !== 'undefined' &&
      location.href &&
      location.href.indexOf(fb.realtime.Constants.FORGE_DOMAIN) !== -1) {
      urlParams[fb.realtime.Constants.REFERER_PARAM] = fb.realtime.Constants.FORGE_REF;
    }
    var connectURL = self.urlFn(urlParams);
    self.log_('Connecting via long-poll to ' + connectURL);
    self.scriptTagHolder.addTag(connectURL, function() { /* do nothing */ });
  });
};

/**
 * Call this when a handshake has completed successfully and we want to consider the connection established
 */
fb.realtime.BrowserPollConnection.prototype.start = function() {
  this.scriptTagHolder.startLongPoll(this.id, this.password);
  this.addDisconnectPingFrame(this.id, this.password);
};

/**
 * Forces long polling to be considered as a potential transport
 */
fb.realtime.BrowserPollConnection.forceAllow = function() {
  fb.realtime.BrowserPollConnection.forceAllow_ = true;
};

/**
 * Forces longpolling to not be considered as a potential transport
 */
fb.realtime.BrowserPollConnection.forceDisallow = function() {
  fb.realtime.BrowserPollConnection.forceDisallow_ = true;
};

// Static method, use string literal so it can be accessed in a generic way
fb.realtime.BrowserPollConnection['isAvailable'] = function() {
  // NOTE: In React-Native there's normally no 'document', but if you debug a React-Native app in
  // the Chrome debugger, 'document' is defined, but document.createElement is null (2015/06/08).
  return fb.realtime.BrowserPollConnection.forceAllow_ || (
      !fb.realtime.BrowserPollConnection.forceDisallow_ &&
      typeof document !== 'undefined' && goog.isDefAndNotNull(document.createElement) &&
      !fb.core.util.isChromeExtensionContentScript() &&
      !fb.core.util.isWindowsStoreApp() &&
      // Sometimes people define a global 'document' in node.js (e.g. with jsdom), but long-polling won't work.
      !fb.login.util.environment.isNodeSdk()
    );
};

/**
 * No-op for polling
 */
fb.realtime.BrowserPollConnection.prototype.markConnectionHealthy = function() { };

/**
 * Stops polling and cleans up the iframe
 * @private
 */
fb.realtime.BrowserPollConnection.prototype.shutdown_ = function() {
  this.isClosed_ = true;

  if (this.scriptTagHolder) {
    this.scriptTagHolder.close();
    this.scriptTagHolder = null;
  }

  //remove the disconnect frame, which will trigger an XHR call to the server to tell it we're leaving.
  if (this.myDisconnFrame) {
    document.body.removeChild(this.myDisconnFrame);
    this.myDisconnFrame = null;
  }

  if (this.connectTimeoutTimer_) {
    clearTimeout(this.connectTimeoutTimer_);
    this.connectTimeoutTimer_ = null;
  }
};

/**
 * Triggered when this transport is closed
 * @private
 */
fb.realtime.BrowserPollConnection.prototype.onClosed_ = function() {
  if (!this.isClosed_) {
    this.log_('Longpoll is closing itself');
    this.shutdown_();

    if (this.onDisconnect_) {
      this.onDisconnect_(this.everConnected_);
      this.onDisconnect_ = null;
    }
  }
};

/**
 * External-facing close handler. RealTime has requested we shut down. Kill our connection and tell the server
 * that we've left.
 */
fb.realtime.BrowserPollConnection.prototype.close = function() {
  if (!this.isClosed_) {
    this.log_('Longpoll is being closed.');
    this.shutdown_();
  }
};

/**
 * Send the JSON object down to the server. It will need to be stringified, base64 encoded, and then
 * broken into chunks (since URLs have a small maximum length).
 * @param {!Object} data The JSON data to transmit.
 */
fb.realtime.BrowserPollConnection.prototype.send = function(data) {
  var dataStr = fb.util.json.stringify(data);
  this.bytesSent += dataStr.length;
  this.stats_.incrementCounter('bytes_sent', dataStr.length);

  //first, lets get the base64-encoded data
  var base64data = fb.core.util.base64Encode(dataStr);

  //We can only fit a certain amount in each URL, so we need to split this request
  //up into multiple pieces if it doesn't fit in one request.
  var dataSegs = fb.core.util.splitStringBySize(base64data, MAX_PAYLOAD_SIZE);

  //Enqueue each segment for transmission. We assign each chunk a sequential ID and a total number
  //of segments so that we can reassemble the packet on the server.
  for (var i = 0; i < dataSegs.length; i++) {
    this.scriptTagHolder.enqueueSegment(this.curSegmentNum, dataSegs.length, dataSegs[i]);
    this.curSegmentNum++;
  }
};

/**
 * This is how we notify the server that we're leaving.
 * We aren't able to send requests with DHTML on a window close event, but we can
 * trigger XHR requests in some browsers (everything but Opera basically).
 * @param {!string} id
 * @param {!string} pw
 */
fb.realtime.BrowserPollConnection.prototype.addDisconnectPingFrame = function(id, pw) {
  if (fb.login.util.environment.isNodeSdk())
    return;
  this.myDisconnFrame = document.createElement('iframe');
  var urlParams = {};
  urlParams[FIREBASE_LONGPOLL_DISCONN_FRAME_REQUEST_PARAM] = 't';
  urlParams[FIREBASE_LONGPOLL_ID_PARAM] = id;
  urlParams[FIREBASE_LONGPOLL_PW_PARAM] = pw;
  this.myDisconnFrame.src = this.urlFn(urlParams);
  this.myDisconnFrame.style.display = 'none';

  document.body.appendChild(this.myDisconnFrame);
};

/**
 * Used to track the bytes received by this client
 * @param {*} args
 * @private
 */
fb.realtime.BrowserPollConnection.prototype.incrementIncomingBytes_ = function(args) {
  // TODO: This is an annoying perf hit just to track the number of incoming bytes.  Maybe it should be opt-in.
  var bytesReceived = fb.util.json.stringify(args).length;
  this.bytesReceived += bytesReceived;
  this.stats_.incrementCounter('bytes_received', bytesReceived);
};

/*********************************************************************************************
 * A wrapper around an iframe that is used as a long-polling script holder.
 * @constructor
 * @param commandCB - The callback to be called when control commands are recevied from the server.
 * @param onMessageCB - The callback to be triggered when responses arrive from the server.
 * @param onDisconnectCB - The callback to be triggered when this tag holder is closed
 * @param urlFn - A function that provides the URL of the endpoint to send data to.
 *********************************************************************************************/
function FirebaseIFrameScriptHolder(commandCB, onMessageCB, onDisconnectCB, urlFn) {
  this.urlFn = urlFn;
  this.onDisconnect = onDisconnectCB;

  //We maintain a count of all of the outstanding requests, because if we have too many active at once it can cause
  //problems in some browsers.
  /**
   * @type {fb.core.util.CountedSet.<number, number>}
   */
  this.outstandingRequests = new fb.core.util.CountedSet();

  //A queue of the pending segments waiting for transmission to the server.
  this.pendingSegs = [];

  //A serial number. We use this for two things:
  // 1) A way to ensure the browser doesn't cache responses to polls
  // 2) A way to make the server aware when long-polls arrive in a different order than we started them. The
  //    server needs to release both polls in this case or it will cause problems in Opera since Opera can only execute
  //    JSONP code in the order it was added to the iframe.
  this.currentSerial = Math.floor(Math.random() * 100000000);

  // This gets set to false when we're "closing down" the connection (e.g. we're switching transports but there's still
  // incoming data from the server that we're waiting for).
  this.sendNewPolls = true;

  if (!fb.login.util.environment.isNodeSdk()) {
    //Each script holder registers a couple of uniquely named callbacks with the window. These are called from the
    //iframes where we put the long-polling script tags. We have two callbacks:
    //   1) Command Callback - Triggered for control issues, like starting a connection.
    //   2) Message Callback - Triggered when new data arrives.
    this.uniqueCallbackIdentifier = fb.core.util.LUIDGenerator();
    window[FIREBASE_LONGPOLL_COMMAND_CB_NAME + this.uniqueCallbackIdentifier] = commandCB;
    window[FIREBASE_LONGPOLL_DATA_CB_NAME + this.uniqueCallbackIdentifier] = onMessageCB;

    //Create an iframe for us to add script tags to.
    this.myIFrame = this.createIFrame_();

    // Set the iframe's contents.
    var script = '';
    // if we set a javascript url, it's IE and we need to set the document domain. The javascript url is sufficient
    // for ie9, but ie8 needs to do it again in the document itself.
    if (this.myIFrame.src && this.myIFrame.src.substr(0, 'javascript:'.length) === 'javascript:') {
      var currentDomain = document.domain;
      script = '<script>document.domain="' + currentDomain + '";</script>';
    }
    var iframeContents = '<html><body>' + script + '</body></html>';
    try {
      this.myIFrame.doc.open();
      this.myIFrame.doc.write(iframeContents);
      this.myIFrame.doc.close();
    } catch (e) {
      fb.core.util.log('frame writing exception');
      if (e.stack) {
        fb.core.util.log(e.stack);
      }
      fb.core.util.log(e);
    }
  } else {
    this.commandCB = commandCB;
    this.onMessageCB = onMessageCB;
  }
}

/**
 * Each browser has its own funny way to handle iframes. Here we mush them all together into one object that I can
 * actually use.
 * @private
 * @return {Element}
 */
FirebaseIFrameScriptHolder.prototype.createIFrame_ = function() {
  var iframe = document.createElement('iframe');
  iframe.style.display = 'none';

  // This is necessary in order to initialize the document inside the iframe
  if (document.body) {
    document.body.appendChild(iframe);
    try {
      // If document.domain has been modified in IE, this will throw an error, and we need to set the
      // domain of the iframe's document manually. We can do this via a javascript: url as the src attribute
      // Also note that we must do this *after* the iframe has been appended to the page. Otherwise it doesn't work.
      var a = iframe.contentWindow.document;
      if (!a) {
        // Apologies for the log-spam, I need to do something to keep closure from optimizing out the assignment above.
        fb.core.util.log('No IE domain setting required');
      }
    } catch (e) {
      var domain = document.domain;
      iframe.src = 'javascript:void((function(){document.open();document.domain=\'' + domain +
        '\';document.close();})())';
    }
  } else {
    // LongPollConnection attempts to delay initialization until the document is ready, so hopefully this
    // never gets hit.
    throw 'Document body has not initialized. Wait to initialize Firebase until after the document is ready.';
  }

  // Get the document of the iframe in a browser-specific way.
  if (iframe.contentDocument) {
    iframe.doc = iframe.contentDocument;  // Firefox, Opera, Safari
  } else if (iframe.contentWindow) {
    iframe.doc = iframe.contentWindow.document;  // Internet Explorer
  } else if (iframe.document) {
    iframe.doc = iframe.document;  //others?
  }
  return iframe;
};

/**
 * Cancel all outstanding queries and remove the frame.
 */
FirebaseIFrameScriptHolder.prototype.close = function() {
  //Mark this iframe as dead, so no new requests are sent.
  this.alive = false;

  if (this.myIFrame) {
    //We have to actually remove all of the html inside this iframe before removing it from the
    //window, or IE will continue loading and executing the script tags we've already added, which
    //can lead to some errors being thrown. Setting innerHTML seems to be the easiest way to do this.
    this.myIFrame.doc.body.innerHTML = '';
    var self = this;
    setTimeout(function() {
      if (self.myIFrame !== null) {
        document.body.removeChild(self.myIFrame);
        self.myIFrame = null;
      }
    }, Math.floor(0));
  }

  if (fb.login.util.environment.isNodeSdk() && this.myID) {
    var urlParams = {};
    urlParams[FIREBASE_LONGPOLL_DISCONN_FRAME_PARAM] = 't';
    urlParams[FIREBASE_LONGPOLL_ID_PARAM] = this.myID;
    urlParams[FIREBASE_LONGPOLL_PW_PARAM] = this.myPW;
    var theURL = this.urlFn(urlParams);
    FirebaseIFrameScriptHolder.nodeRestRequest(theURL);
  }

  // Protect from being called recursively.
  var onDisconnect = this.onDisconnect;
  if (onDisconnect) {
    this.onDisconnect = null;
    onDisconnect();
  }
};

/**
 * Actually start the long-polling session by adding the first script tag(s) to the iframe.
 * @param {!string} id - The ID of this connection
 * @param {!string} pw - The password for this connection
 */
FirebaseIFrameScriptHolder.prototype.startLongPoll = function(id, pw) {
  this.myID = id;
  this.myPW = pw;
  this.alive = true;

  //send the initial request. If there are requests queued, make sure that we transmit as many as we are currently able to.
  while (this.newRequest_()) {}
};

/**
 * This is called any time someone might want a script tag to be added. It adds a script tag when there aren't
 * too many outstanding requests and we are still alive.
 *
 * If there are outstanding packet segments to send, it sends one. If there aren't, it sends a long-poll anyways if
 * needed.
 */
FirebaseIFrameScriptHolder.prototype.newRequest_ = function() {
  // We keep one outstanding request open all the time to receive data, but if we need to send data
  // (pendingSegs.length > 0) then we create a new request to send the data.  The server will automatically
  // close the old request.
  if (this.alive && this.sendNewPolls && this.outstandingRequests.count() < (this.pendingSegs.length > 0 ? 2 : 1)) {
    //construct our url
    this.currentSerial++;
    var urlParams = {};
    urlParams[FIREBASE_LONGPOLL_ID_PARAM] = this.myID;
    urlParams[FIREBASE_LONGPOLL_PW_PARAM] = this.myPW;
    urlParams[FIREBASE_LONGPOLL_SERIAL_PARAM] = this.currentSerial;
    var theURL = this.urlFn(urlParams);
    //Now add as much data as we can.
    var curDataString = '';
    var i = 0;

    while (this.pendingSegs.length > 0) {
      //first, lets see if the next segment will fit.
      var nextSeg = this.pendingSegs[0];
      if (nextSeg.d.length + SEG_HEADER_SIZE + curDataString.length <= MAX_URL_DATA_SIZE) {
        //great, the segment will fit. Lets append it.
        var theSeg = this.pendingSegs.shift();
        curDataString = curDataString + '&' + FIREBASE_LONGPOLL_SEGMENT_NUM_PARAM + i + '=' + theSeg.seg +
            '&' + FIREBASE_LONGPOLL_SEGMENTS_IN_PACKET + i + '=' + theSeg.ts + '&' + FIREBASE_LONGPOLL_DATA_PARAM + i + '=' + theSeg.d;
        i++;
      } else {
        break;
      }
    }

    theURL = theURL + curDataString;
    this.addLongPollTag_(theURL, this.currentSerial);

    return true;
  } else {
    return false;
  }
};

/**
 * Queue a packet for transmission to the server.
 * @param segnum - A sequential id for this packet segment used for reassembly
 * @param totalsegs - The total number of segments in this packet
 * @param data - The data for this segment.
 */
FirebaseIFrameScriptHolder.prototype.enqueueSegment = function(segnum, totalsegs, data) {
  //add this to the queue of segments to send.
  this.pendingSegs.push({seg: segnum, ts: totalsegs, d: data});

  //send the data immediately if there isn't already data being transmitted, unless
  //startLongPoll hasn't been called yet.
  if (this.alive) {
    this.newRequest_();
  }
};

/**
 * Add a script tag for a regular long-poll request.
 * @param {!string} url - The URL of the script tag.
 * @param {!number} serial - The serial number of the request.
 * @private
 */
FirebaseIFrameScriptHolder.prototype.addLongPollTag_ = function(url, serial) {
  var self = this;
  //remember that we sent this request.
  self.outstandingRequests.add(serial, 1);

  var doNewRequest = function() {
    self.outstandingRequests.remove(serial);
    self.newRequest_();
  };

  // If this request doesn't return on its own accord (by the server sending us some data), we'll
  // create a new one after the KEEPALIVE interval to make sure we always keep a fresh request open.
  var keepaliveTimeout = setTimeout(doNewRequest, Math.floor(KEEPALIVE_REQUEST_INTERVAL));

  var readyStateCB = function() {
    // Request completed.  Cancel the keepalive.
    clearTimeout(keepaliveTimeout);

    // Trigger a new request so we can continue receiving data.
    doNewRequest();
  };

  this.addTag(url, readyStateCB);
};

/**
 * Add an arbitrary script tag to the iframe.
 * @param {!string} url - The URL for the script tag source.
 * @param {!function()} loadCB - A callback to be triggered once the script has loaded.
 */
FirebaseIFrameScriptHolder.prototype.addTag = function(url, loadCB) {
  if (fb.login.util.environment.isNodeSdk()) {
    this.doNodeLongPoll(url, loadCB);
  } else {

    var self = this;
    setTimeout(function() {
      try {
        // if we're already closed, don't add this poll
        if (!self.sendNewPolls) return;
        var newScript = self.myIFrame.doc.createElement('script');
        newScript.type = 'text/javascript';
        newScript.async = true;
        newScript.src = url;
        newScript.onload = newScript.onreadystatechange = function() {
          var rstate = newScript.readyState;
          if (!rstate || rstate === 'loaded' || rstate === 'complete') {
            newScript.onload = newScript.onreadystatechange = null;
            if (newScript.parentNode) {
              newScript.parentNode.removeChild(newScript);
            }
            loadCB();
          }
        };
        newScript.onerror = function() {
          fb.core.util.log('Long-poll script failed to load: ' + url);
          self.sendNewPolls = false;
          self.close();
        };
        self.myIFrame.doc.body.appendChild(newScript);
      } catch (e) {
        // TODO: we should make this error visible somehow
      }
    }, Math.floor(1));
  }
};

if (fb.login.util.environment.isNodeSdk()) {

  /**
   * @type {?function({url: string, forever: boolean}, function(Error, number, string))}
   */
  FirebaseIFrameScriptHolder.request = null;

  /**
   * @param {{url: string, forever: boolean}} req
   * @param {function(string)=} onComplete
   */
  FirebaseIFrameScriptHolder.nodeRestRequest = function(req, onComplete) {
    if (!FirebaseIFrameScriptHolder.request)
      FirebaseIFrameScriptHolder.request =
        /** @type {function({url: string, forever: boolean}, function(Error, number, string))} */ (require('request'));

    FirebaseIFrameScriptHolder.request(req, function(error, response, body) {
      if (error)
        throw 'Rest request for ' + req.url + ' failed.';

      if (onComplete)
        onComplete(body);
    });
  };

  /**
   * @param {!string} url
   * @param {function()} loadCB
   */
  FirebaseIFrameScriptHolder.prototype.doNodeLongPoll = function(url, loadCB) {
    var self = this;
    FirebaseIFrameScriptHolder.nodeRestRequest({ url: url, forever: true }, function(body) {
      self.evalBody(body);
      loadCB();
    });
  };

  /**
   * Evaluates the string contents of a jsonp response.
   * @param {!string} body
   */
  FirebaseIFrameScriptHolder.prototype.evalBody = function(body) {
    //jsonpCB is externed in firebase-extern.js
    eval('var jsonpCB = function(' + FIREBASE_LONGPOLL_COMMAND_CB_NAME + ', ' + FIREBASE_LONGPOLL_DATA_CB_NAME + ') {' +
          body +
        '}');
    jsonpCB(this.commandCB, this.onMessageCB);
  };
}
