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
 * @fileoverview Defines fireauth.iframeclient.IframeWrapper used to communicate
 * with the hidden iframe to detect Auth events.
 */

goog.provide('fireauth.iframeclient.IframeWrapper');

goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.html.TrustedResourceUrl');
goog.require('goog.net.jsloader');
goog.require('goog.string.Const');


/**
 * Defines the hidden iframe wrapper for cross origin communications.
 * @param {string} url The hidden iframe src URL.
 * @constructor
 */
fireauth.iframeclient.IframeWrapper = function(url) {
  /** @private {string} The hidden iframe URL. */
  this.url_ = url;

  /**
   * @type {?gapi.iframes.Iframe}
   * @private
   */
  this.iframe_ = null;

  /** @private {!goog.Promise} A promise that resolves on iframe open. */
  this.onIframeOpen_ = this.open_();
};


/**
 * @typedef {{
 *   type: string
 * }}
 */
fireauth.iframeclient.IframeWrapper.Message;

/**
 * Returns URL, src of the hidden iframe.
 * @return {string}
 * @private
 */
fireauth.iframeclient.IframeWrapper.prototype.getPath_ = function() {
  return this.url_;
};


/**
 * @return {!goog.Promise} The promise that resolves when the iframe is ready.
 */
fireauth.iframeclient.IframeWrapper.prototype.onReady = function() {
  return this.onIframeOpen_;
};


/**
 * Returns options used to open the iframe.
 * @return {!gapi.iframes.OptionsBag}
 * @private
 */
fireauth.iframeclient.IframeWrapper.prototype.getOptions_ = function() {
  var options = /** @type {!gapi.iframes.OptionsBag} */ ({
    'where': document.body,
    'url': this.getPath_(),
    'messageHandlersFilter': /** @type {!gapi.iframes.IframesFilter} */ (
        fireauth.util.getObjectRef(
            'gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER')),
    'attributes': {
      'style': {
        'position': 'absolute',
        'top': '-100px',
        'width': '1px',
        'height': '1px'
      }
    },
    'dontclear': true
  });
  return options;
};


/**
 * Opens an iframe.
 * @return {!goog.Promise} A promise that resolves on successful iframe open.
 * @private
 */
fireauth.iframeclient.IframeWrapper.prototype.open_ = function() {
  var self = this;
  return fireauth.iframeclient.IframeWrapper.loadGApiJs_().then(function() {
    return new goog.Promise(function(resolve, reject) {
      /**
       * @param {?gapi.iframes.Iframe} iframe The new opened iframe.
       */
      var onOpen = function(iframe) {
        self.iframe_ = iframe;
        self.iframe_.restyle({
          // Prevent iframe from closing on mouse out.
          'setHideOnLeave': false
        });
        // Confirm iframe is correctly loaded.
        // To fallback on failure, set a timeout.
        var networkErrorTimer = setTimeout(function() {
          reject(new Error('Network Error'));
        }, fireauth.iframeclient.IframeWrapper.PING_TIMEOUT_.get());
        // Clear timer and resolve pending iframe ready promise.
        var clearTimerAndResolve = function() {
          clearTimeout(networkErrorTimer);
          resolve();
        };
        // This returns an IThenable. However the reject part does not call
        // when the iframe is not loaded.
        iframe.ping(clearTimerAndResolve).then(
            clearTimerAndResolve,
            function(error) { reject(new Error('Network Error')); });
      };
      /** @type {function():!gapi.iframes.Context} */ (
          fireauth.util.getObjectRef('gapi.iframes.getContext'))().open(
              self.getOptions_(), onOpen);
    });
  });
};


/**
 * @param {!fireauth.iframeclient.IframeWrapper.Message} message to send.
 * @return {!goog.Promise<?Object>} The promise that resolve when message is
 *     sent.
 */
fireauth.iframeclient.IframeWrapper.prototype.sendMessage = function(message) {
  var self = this;
  return this.onIframeOpen_.then(function() {
    return new goog.Promise(function(resolve, reject) {
      self.iframe_.send(
          message['type'],
          message,
          resolve,
          /** @type {!gapi.iframes.IframesFilter} */ (
              fireauth.util.getObjectRef(
                  'gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER')));

    });
  });
};


/**
 * Registers a listener to a post message.
 * @param {string} eventName The message to register for.
 * @param {gapi.iframes.MessageHandler} handler Message handler.
 */
fireauth.iframeclient.IframeWrapper.prototype.registerEvent =
    function(eventName, handler) {
  var self = this;
  this.onIframeOpen_.then(function() {
    self.iframe_.register(
        eventName,
        /** @type {function(this:gapi.iframes.Iframe,
         *                  *, gapi.iframes.Iframe): *}
         */ (handler),
        /** @type {!gapi.iframes.IframesFilter} */ (
            fireauth.util.getObjectRef(
                'gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER')));
  });
};


/**
 * Unregisters a listener to a post message.
 * @param {string} eventName The message to unregister.
 * @param {gapi.iframes.MessageHandler} handler Message handler.
 */
fireauth.iframeclient.IframeWrapper.prototype.unregisterEvent =
    function(eventName, handler) {
  var self = this;
  this.onIframeOpen_.then(function() {
    self.iframe_.unregister(
        eventName,
        /** @type {(function(this:gapi.iframes.Iframe,
         *                   *, gapi.iframes.Iframe): *|undefined)}
         */ (handler));
  });
};


/** @private @const {!goog.string.Const} The GApi loader URL. */
fireauth.iframeclient.IframeWrapper.GAPI_LOADER_SRC_ = goog.string.Const.from(
    'https://apis.google.com/js/api.js?onload=%{onload}');


/**
 * @private @const {!fireauth.util.Delay} The gapi.load network error timeout
 *     delay with units in ms.
 */
fireauth.iframeclient.IframeWrapper.NETWORK_TIMEOUT_ =
    new fireauth.util.Delay(30000, 60000);


/**
 * @private @const {!fireauth.util.Delay} The iframe ping error timeout delay
 *     with units in ms.
 */
fireauth.iframeclient.IframeWrapper.PING_TIMEOUT_ =
    new fireauth.util.Delay(5000, 15000);


/** @private {?goog.Promise} The cached GApi loader promise. */
fireauth.iframeclient.IframeWrapper.cachedGApiLoader_ = null;


/** Resets the cached GApi loader. */
fireauth.iframeclient.IframeWrapper.resetCachedGApiLoader = function() {
  fireauth.iframeclient.IframeWrapper.cachedGApiLoader_ = null;
};



/**
 * Loads the GApi client library if it is not loaded for gapi.iframes usage.
 * @return {!goog.Promise} A promise that resolves when gapi.iframes is loaded.
 * @private
 */
fireauth.iframeclient.IframeWrapper.loadGApiJs_ = function() {
  // If already pending or resolved, return the cached promise.
  if (fireauth.iframeclient.IframeWrapper.cachedGApiLoader_) {
    return fireauth.iframeclient.IframeWrapper.cachedGApiLoader_;
  }
  // If there is no cached promise, initialize a new one.
  fireauth.iframeclient.IframeWrapper.cachedGApiLoader_ =
      new goog.Promise(function(resolve, reject) {
    // Function to run when gapi.load is ready.
    var onGapiLoad = function() {
      // The developer may have tried to previously run gapi.load and failed.
      // Run this to fix that.
      fireauth.util.resetUnloadedGapiModules();
      var loader = /** @type {function(string, !Object)} */ (
          fireauth.util.getObjectRef('gapi.load'));
      loader('gapi.iframes', {
        'callback': resolve,
        'ontimeout': function() {
          // The above reset may be sufficient, but having this reset after
          // failure ensures that if the developer calls gapi.load after the
          // connection is re-established and before another attempt to embed
          // the iframe, it would work and would not be broken because of our
          // failed attempt.
          // Timeout when gapi.iframes.Iframe not loaded.
          fireauth.util.resetUnloadedGapiModules();
          reject(new Error('Network Error'));
        },
        'timeout': fireauth.iframeclient.IframeWrapper.NETWORK_TIMEOUT_.get()
      });
    };
    if (fireauth.util.getObjectRef('gapi.iframes.Iframe')) {
      // If gapi.iframes.Iframe available, resolve.
      resolve();
    } else if (fireauth.util.getObjectRef('gapi.load')) {
      // Gapi loader ready, load gapi.iframes.
      onGapiLoad();
    } else {
      // Create a new iframe callback when this is called so as not to overwrite
      // any previous defined callback. This happens if this method is called
      // multiple times in parallel and could result in the later callback
      // overwriting the previous one. This would end up with a iframe
      // timeout.
      var cbName = '__iframefcb' +
          Math.floor(Math.random() * 1000000).toString();
      // GApi loader not available, dynamically load platform.js.
      goog.global[cbName] = function() {
        // GApi loader should be ready.
        if (fireauth.util.getObjectRef('gapi.load')) {
          onGapiLoad();
        } else {
          // Gapi loader failed, throw error.
          reject(new Error('Network Error'));
        }
      };
      // Build GApi loader.
      var url = goog.html.TrustedResourceUrl.format(
          fireauth.iframeclient.IframeWrapper.GAPI_LOADER_SRC_,
          {'onload': cbName});
      // Load GApi loader.
      var result = goog.Promise.resolve(goog.net.jsloader.safeLoad(url));
      result.thenCatch(function(error) {
        // In case library fails to load, typically due to a network error,
        // reset cached loader to null to force a refresh on a retrial.
        reject(new Error('Network Error'));
      });
    }
  }).thenCatch(function(error) {
    // Reset cached promise to allow for retrial.
    fireauth.iframeclient.IframeWrapper.cachedGApiLoader_ = null;
    throw error;
  });
  return fireauth.iframeclient.IframeWrapper.cachedGApiLoader_;
};
