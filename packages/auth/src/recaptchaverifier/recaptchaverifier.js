/**
 * @license
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
 * @fileoverview Defines the reCAPTCHA app verifier and its base class. The
 * former is currently used for web phone authentication whereas the latter is
 * used for the mobile app verification web fallback.
 */
goog.provide('fireauth.BaseRecaptchaVerifier');
goog.provide('fireauth.RecaptchaVerifier');

goog.require('fireauth.AuthError');
goog.require('fireauth.RecaptchaMockLoader');
goog.require('fireauth.RecaptchaRealLoader');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.constants');
goog.require('fireauth.object');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.dom');


/**
 * Creates the firebase base reCAPTCHA app verifier independent of Firebase
 * App or Auth instances.
 *
 * @param {string} apiKey The API key used to initialize the RPC handler for
 *     querying the Auth backend.
 * @param {!Element|string} container The reCAPTCHA container parameter. This
 *     has different meaning depending on whether the reCAPTCHA is hidden or
 *     visible.
 * @param {?Object=} opt_parameters The optional reCAPTCHA parameters.
 * @param {?(function():?string)=} opt_getLanguageCode The language code getter
 *     function.
 * @param {?string=} opt_clientVersion The optional client version to append to
 *     RPC header.
 * @param {?Object=} opt_rpcHandlerConfig The optional RPC handler
 *     configuration, typically passed when different Auth endpoints are to be
 *     used.
 * @param {boolean=} opt_isTestingMode Whether the reCAPTCHA is to be rendered
 *     in testing mode.
 * @constructor
 */
fireauth.BaseRecaptchaVerifier = function(apiKey, container, opt_parameters,
    opt_getLanguageCode, opt_clientVersion, opt_rpcHandlerConfig,
    opt_isTestingMode) {
  // Set the type readonly property needed for full implementation of the
  // firebase.auth.ApplicationVerifier interface.
  fireauth.object.setReadonlyProperty(this, 'type', 'recaptcha');
  /**
   * @private {?goog.Promise<void>} The cached reCAPTCHA ready response. This is
   *     null until the first time it is triggered or when an error occurs in
   *     getting ready.
   */
  this.cachedReadyPromise_ = null;
  /** @private {?number} The reCAPTCHA widget ID. Null when not rendered. */
  this.widgetId_ = null;
  /** @private {boolean} Whether the instance is already destroyed. */
  this.destroyed_ = false;
  /** @private {!Element|string} The reCAPTCHA container. */
  this.container_ = container;
  /**
   * @private {?fireauth.grecaptcha} The reCAPTCHA client library namespace.
   */
  this.grecaptcha_ = null;
  /**
   * @const @private {!fireauth.RecaptchaLoader} The grecaptcha loader.
   */
  this.recaptchaLoader_ = !!opt_isTestingMode ?
      fireauth.RecaptchaMockLoader.getInstance() :
      fireauth.RecaptchaRealLoader.getInstance();
  // If no parameters passed, use default settings.
  // Currently, visible recaptcha is the default setting as invisible reCAPTCHA
  // is not yet supported by the backend.
  /** @private {!Object} The reCAPTCHA parameters. */
  this.parameters_ = opt_parameters || {
    'theme': 'light',
    'type': 'image'
  };
  /** @private {!Array<!goog.Promise<*>|!goog.Promise<void>>} List of
   *      pending promises. */
  this.pendingPromises_ = [];
  if (this.parameters_[fireauth.BaseRecaptchaVerifier.ParamName.SITEKEY]) {
    // sitekey should not be provided.
    throw new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        'sitekey should not be provided for reCAPTCHA as one is ' +
        'automatically provisioned for the current project.');
  }
  /** @private {boolean} Whether the reCAPTCHA is invisible or not. */
  this.isInvisible_ =
      this.parameters_[fireauth.BaseRecaptchaVerifier.ParamName.SIZE] ===
      'invisible';
  // Check if DOM is supported.
  if (!fireauth.util.isDOMSupported()) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED,
        'RecaptchaVerifier is only supported in a browser HTTP/HTTPS ' +
        'environment with DOM support.');
  }
  // reCAPTCHA container must be valid and if visible, not empty.
  // An invisible reCAPTCHA will not render in its container. That container
  // will execute the reCAPTCHA when it is clicked.
  if (!goog.dom.getElement(container) ||
      (!this.isInvisible_ && goog.dom.getElement(container).hasChildNodes())) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        'reCAPTCHA container is either not found or already contains inner ' +
        'elements!');
  }
  /**
   * @private {!fireauth.RpcHandler} The RPC handler for querying the auth
   *     backend.
   */
  this.rpcHandler_ = new fireauth.RpcHandler(
      apiKey,
      opt_rpcHandlerConfig || null,
      opt_clientVersion || null);
  /**
   * @private {function():?string} Current language code getter.
   */
  this.getLanguageCode_ = opt_getLanguageCode || function() {return null;};
  var self = this;
  /**
   * @private {!Array<function(?string)>} The token change listeners.
   */
  this.tokenListeners_ = [];
  // Wrap token callback.
  var existingCallback =
      this.parameters_[fireauth.BaseRecaptchaVerifier.ParamName.CALLBACK];
  this.parameters_[fireauth.BaseRecaptchaVerifier.ParamName.CALLBACK] =
      function(response) {
    // Dispatch internal event for the token response.
    self.dispatchEvent_(response);
    if (typeof existingCallback === 'function') {
      existingCallback(response);
    } else if (typeof existingCallback === 'string') {
      // Check if the provided callback is a global function name.
      var cb = fireauth.util.getObjectRef(existingCallback, goog.global);
      if (typeof cb === 'function') {
        // If so, trigger it.
        cb(response);
      }
    }
  };
  // Wrap expired token callback.
  var existingExpiredCallback = this.parameters_[
    fireauth.BaseRecaptchaVerifier.ParamName.EXPIRED_CALLBACK];
  this.parameters_[fireauth.BaseRecaptchaVerifier.ParamName.EXPIRED_CALLBACK] =
      function() {
    // Dispatch internal event for the token expiration.
    self.dispatchEvent_(null);
    if (typeof existingExpiredCallback === 'function') {
      existingExpiredCallback();
    } else if (typeof existingExpiredCallback === 'string') {
      // Check if the provided expired callback is a global function name.
      var cb = fireauth.util.getObjectRef(existingExpiredCallback, goog.global);
      if (typeof cb === 'function') {
        // If so, trigger it.
        cb();
      }
    }
  };
};


/**
 * grecaptcha parameter names.
 * @enum {string}
 */
fireauth.BaseRecaptchaVerifier.ParamName = {
  CALLBACK: 'callback',
  EXPIRED_CALLBACK: 'expired-callback',
  SITEKEY: 'sitekey',
  SIZE: 'size'
};


/**
 * Dispatches the token change event to all subscribed listeners.
 * @param {?string} token The current detected token, null for none.
 * @private
 */
fireauth.BaseRecaptchaVerifier.prototype.dispatchEvent_ = function(token) {
  for (var i = 0; i < this.tokenListeners_.length; i++) {
    try {
      this.tokenListeners_[i](token);
    } catch (e) {
      // If any handler fails, ignore and run next handler.
    }
  }
};


/**
 * Add a reCAPTCHA token change listener.
 * @param {function(?string)} listener The token listener to add.
 * @private
 */
fireauth.BaseRecaptchaVerifier.prototype.addTokenChangeListener_ =
    function(listener) {
  this.tokenListeners_.push(listener);
};


/**
 * Remove a reCAPTCHA token change listener.
 * @param {function(?string)} listener The token listener to remove.
 * @private
 */
fireauth.BaseRecaptchaVerifier.prototype.removeTokenChangeListener_ =
    function(listener) {
  goog.array.removeAllIf(this.tokenListeners_, function(ele) {
    return ele == listener;
  });
};


/**
 * Takes in a pending promise, saves it and adds a clean up callback which
 * forgets the pending promise after it is fulfilled and echoes the promise
 * back.
 * @param {!goog.Promise<*, *>|!goog.Promise<void>} p The pending promise.
 * @return {!goog.Promise<*, *>|!goog.Promise<void>}
 * @private
 */
fireauth.BaseRecaptchaVerifier.prototype.registerPendingPromise_ = function(p) {
  var self = this;
  // Save created promise in pending list.
  this.pendingPromises_.push(p);
  p.thenAlways(function() {
    // When fulfilled, remove from pending list.
    goog.array.remove(self.pendingPromises_, p);
  });
  // Return the promise.
  return p;
};


/** @return {boolean} Whether verifier instance has pending promises. */
fireauth.BaseRecaptchaVerifier.prototype.hasPendingPromises = function() {
  return this.pendingPromises_.length != 0;
};


/**
 * Gets the current RecaptchaVerifier in a ready state for rendering by first
 * checking that the environment supports a reCAPTCHA, loading reCAPTCHA
 * dependencies if not already available and then getting the Firebase project's
 * provisioned reCAPTCHA configuration.
 * @return {!goog.Promise<void>} The promise that resolves when recaptcha
 *     is ready for rendering.
 * @private
 */
fireauth.BaseRecaptchaVerifier.prototype.isReady_ = function() {
  var self = this;
  // If previously called, return the cached response.
  if (this.cachedReadyPromise_) {
    return this.cachedReadyPromise_;
  }
  this.cachedReadyPromise_ = this.registerPendingPromise_(goog.Promise.resolve()
      .then(function() {
        // Verify environment first.
        // Fail quickly from a worker environment or non-HTTP/HTTPS environment.
        if (fireauth.util.isHttpOrHttps() && !fireauth.util.isWorker()) {
          // Wait for DOM to be ready as this feature depends on that.
          return fireauth.util.onDomReady();
        } else {
          throw new fireauth.AuthError(
              fireauth.authenum.Error.OPERATION_NOT_SUPPORTED,
              'RecaptchaVerifier is only supported in a browser HTTP/HTTPS ' +
              'environment.');
        }
      })
      .then(function() {
        // Load external reCAPTCHA dependencies if not already there, taking
        // into account the current language code.
        return self.recaptchaLoader_.loadRecaptchaDeps(self.getLanguageCode_());
      })
      .then(function(grecaptcha) {
        self.grecaptcha_ = grecaptcha;
        // Load Firebase project's reCAPTCHA configuration.
        return self.rpcHandler_.getRecaptchaParam();
      })
      .then(function(result) {
        // Update the reCAPTCHA parameters.
        self.parameters_[fireauth.BaseRecaptchaVerifier.ParamName.SITEKEY] =
            result[fireauth.RpcHandler.AuthServerField.RECAPTCHA_SITE_KEY];
      }).thenCatch(function(error) {
        // Anytime an error occurs, reset the cached ready promise to rerun on
        // retrial.
        self.cachedReadyPromise_ = null;
        // Rethrow the error.
        throw error;
      }));
  // Return the cached/pending ready promise.
  return this.cachedReadyPromise_;
};

/**
 * Renders the reCAPTCHA and returns the allocated widget ID.
 * @return {!goog.Promise<number>} The promise that resolves with the reCAPTCHA
 *     widget ID when it is rendered.
 */
fireauth.BaseRecaptchaVerifier.prototype.render = function() {
  this.checkIfDestroyed_();
  var self = this;
  // Get reCAPTCHA ready.
  return this.registerPendingPromise_(this.isReady_().then(function() {
    if (self.widgetId_ === null) {
      // For a visible reCAPTCHA, embed in a wrapper DIV container to allow
      // re-rendering in the same developer provided container.
      var container = self.container_;
      if (!self.isInvisible_) {
        // Get outer container (the developer provided container).
        var outerContainer = goog.dom.getElement(container);
        // Create wrapper temp DIV container.
        container = goog.dom.createDom(goog.dom.TagName.DIV);
        // Add temp DIV to outer container.
        outerContainer.appendChild(container);
      }
      // If not initialized, initialize reCAPTCHA and return its widget ID.
      self.widgetId_ = self.grecaptcha_.render(container, self.parameters_);
    }
    return self.widgetId_;
  }));
};


/**
 * Gets the reCAPTCHA ready and waits for the reCAPTCHA token to be available
 * before resolving the promise returned.
 * @return {!goog.Promise<string>} The promise that resolves with the reCAPTCHA
 *     token when reCAPTCHA challenge is solved.
 */
fireauth.BaseRecaptchaVerifier.prototype.verify = function() {
  // Fail if reCAPTCHA is already destroyed.
  this.checkIfDestroyed_();
  var self = this;
  // Render reCAPTCHA.
  return this.registerPendingPromise_(this.render().then(function(widgetId) {
    return new goog.Promise(function(resolve, reject) {
      // Get current reCAPTCHA token.
      var recaptchaToken = self.grecaptcha_.getResponse(widgetId);
      if (recaptchaToken) {
        // Unexpired token already available. Resolve pending promise with that
        // token.
        resolve(recaptchaToken);
      } else {
        // No token available. Listen to token change.
        var cb = function(token) {
          if (!token) {
            // Ignore token expirations.
            return;
          }
          // Remove temporary token change listener.
          self.removeTokenChangeListener_(cb);
          // Resolve with new token.
          resolve(token);
        };
        // Add temporary token change listener.
        self.addTokenChangeListener_(cb);
        if (self.isInvisible_) {
          // Execute invisible reCAPTCHA to force a challenge.
          // This should do nothing if already triggered either by developer or
          // by a button click.
          self.grecaptcha_.execute(/** @type {number} */ (self.widgetId_));
        }
      }
    });
  }));
};


/**
 * Resets the reCAPTCHA widget.
 */
fireauth.BaseRecaptchaVerifier.prototype.reset = function() {
  this.checkIfDestroyed_();
  if (this.widgetId_ !== null) {
    this.grecaptcha_.reset(this.widgetId_);
  }
};


/**
 * Throws an error if the reCAPTCHA verifier is already cleared.
 * @private
 */
fireauth.BaseRecaptchaVerifier.prototype.checkIfDestroyed_ = function() {
  if (this.destroyed_) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR,
        'RecaptchaVerifier instance has been destroyed.');
  }
};


/**
 * Removes the reCAPTCHA from the DOM.
 */
fireauth.BaseRecaptchaVerifier.prototype.clear = function() {
  this.checkIfDestroyed_();
  this.destroyed_ = true;
  // Decrement reCAPTCHA instance counter.
  this.recaptchaLoader_.clearSingleRecaptcha();
  // Cancel all pending promises.
  for (var i = 0; i < this.pendingPromises_.length; i++) {
    this.pendingPromises_[i].cancel(
        'RecaptchaVerifier instance has been destroyed.');
  }
  if (!this.isInvisible_) {
    goog.dom.removeChildren(goog.dom.getElement(this.container_));
  }
};


/**
 * Creates the Firebase reCAPTCHA app verifier, publicly available, for the
 * Firebase app provided, used for web phone authentication.
 * This is a subclass of fireauth.BaseRecaptchaVerifier.
 *
 * @param {!Element|string} container The reCAPTCHA container parameter. This
 *     has different meaning depending on whether the reCAPTCHA is hidden or
 *     visible.
 * @param {?Object=} opt_parameters The optional reCAPTCHA parameters.
 * @param {?firebase.app.App=} opt_app The corresponding Firebase app.
 * @constructor
 * @extends {fireauth.BaseRecaptchaVerifier}
 */
fireauth.RecaptchaVerifier = function(container, opt_parameters, opt_app) {
  var isTestingMode = false;
  var apiKey;
  try {
    /** @private {!firebase.app.App} The corresponding Firebase app instance. */
    this.app_ = opt_app || firebase.app();
  } catch (error) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        'No firebase.app.App instance is currently initialized.');
  }
  // API key is required for web client RPC calls.
  if (this.app_.options && this.app_.options['apiKey']) {
    apiKey = this.app_.options['apiKey'];
  } else {
    throw new fireauth.AuthError(fireauth.authenum.Error.INVALID_API_KEY);
  }
  var self = this;
  // Construct the language code getter based on the underlying Auth instance.
  var getLanguageCode = function() {
    var languageCode;
    // Get the latest language setting.
    // reCAPTCHA does not support updating the language of an already
    // rendered reCAPTCHA. Reloading the SDK with the new hl will break
    // the existing rendered localized reCAPTCHA. We will need to
    // document that a new fireauth.BaseRecaptchaVerifier instance needs
    // to be instantiated after the language is updated. Otherwise, the
    // old language code will remain active on the existing instance.
    try {
      languageCode = self.app_['auth']().getLanguageCode();
    } catch (e) {
      languageCode = null;
    }
    return languageCode;
  };
  // Get the framework version from Auth instance.
  var frameworkVersion = null;
  try {
    frameworkVersion = this.app_['auth']().getFramework();
  } catch (e) {
    // Do nothing.
  }
  try {
    isTestingMode =
        this.app_['auth']()['settings']['appVerificationDisabledForTesting'];
  } catch (e) {
    // Do nothing.
  }
  // Get the client version based on the Firebase JS version.
  var clientFullVersion = firebase.SDK_VERSION ?
      fireauth.util.getClientVersion(
          fireauth.util.ClientImplementation.JSCORE, firebase.SDK_VERSION,
          frameworkVersion) :
      null;
  // Call the superclass constructor with the computed API key, reCAPTCHA
  // container, optional parameters, language code getter, Firebase JS client
  // version and the current client configuration endpoints.
  fireauth.RecaptchaVerifier.base(this, 'constructor', apiKey,
      container, opt_parameters, getLanguageCode, clientFullVersion,
      fireauth.constants.getEndpointConfig(fireauth.constants.clientEndpoint),
      isTestingMode);
};
goog.inherits(fireauth.RecaptchaVerifier, fireauth.BaseRecaptchaVerifier);
