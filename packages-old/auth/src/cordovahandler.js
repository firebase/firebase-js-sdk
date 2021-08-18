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
 * @fileoverview Defines Cordova utility and helper functions.
 * The following plugins must be installed:
 * cordova plugin add cordova-plugin-buildinfo
 * cordova plugin add cordova-universal-links-plugin-fix
 * cordova plugin add cordova-plugin-browsertab
 * cordova plugin add cordova-plugin-inappbrowser
 * iOS custom scheme support:
 * cordova plugin add cordova-plugin-customurlscheme --variable \
 * URL_SCHEME=com.firebase.example
 * Console logging in iOS:
 * cordova plugin add cordova-plugin-console
 */

goog.provide('fireauth.CordovaHandler');

goog.require('fireauth.AuthError');
goog.require('fireauth.AuthEvent');
goog.require('fireauth.AuthProvider');
goog.require('fireauth.DynamicLink');
goog.require('fireauth.OAuthSignInHandler');
goog.require('fireauth.UniversalLinkSubscriber');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.constants');
goog.require('fireauth.iframeclient.IfcHandler');
goog.require('fireauth.storage.AuthEventManager');
goog.require('fireauth.storage.OAuthHandlerManager');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Timer');
goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.crypt');
goog.require('goog.crypt.Sha256');


/**
 * Cordova environment utility and helper functions.
 * @param {string} authDomain The application authDomain.
 * @param {string} apiKey The API key.
 * @param {string} appName The App name.
 * @param {?string=} clientVersion The optional client version string.
 * @param {number=} initialTimeout Initial Auth event timeout.
 * @param {number=} redirectTimeout Redirect result timeout.
 * @param {?string=} endpointId The endpoint ID (staging, test Gaia, etc).
 * @param {?fireauth.constants.EmulatorSettings=} emulatorConfig The emulator
 *     configuration
 * @constructor
 * @implements {fireauth.OAuthSignInHandler}
 */
fireauth.CordovaHandler = function(authDomain, apiKey, appName,
    clientVersion, initialTimeout, redirectTimeout, endpointId, emulatorConfig) {
  /** @private {string} The application authDomain. */
  this.authDomain_ = authDomain;
  /** @private {string} The application API key. */
  this.apiKey_ = apiKey;
  /** @private {string} The application name. */
  this.appName_ = appName;
  /** @private {?string} The client version */
  this.clientVersion_ = clientVersion || null;
  /** @private {?string} The Auth endpoint ID. */
  this.endpointId_ = endpointId || null;
  /**
   * @private @const {?fireauth.constants.EmulatorSettings|undefined}
   * The emulator configuration
   */
  this.emulatorConfig_ = emulatorConfig;
  /** @private {string} The storage key. */
  this.storageKey_ = fireauth.util.createStorageKey(apiKey, appName);
  /**
   * @private {!fireauth.storage.OAuthHandlerManager} The OAuth handler
   *     storage manager reference, used to save a partial Auth event when
   *     redirect operation is triggered.
   */
  this.savePartialEventManager_ = new fireauth.storage.OAuthHandlerManager();
  /**
   * @private {!fireauth.storage.AuthEventManager} The Auth event storage
   *     manager reference. This is used to get back the saved partial Auth
   *     event and then delete on successful handling.
   */
  this.getAndDeletePartialEventManager_ =
      new fireauth.storage.AuthEventManager(this.storageKey_);
  /**
   * @private {?goog.Promise<!fireauth.AuthEvent>} A promise that resolves with
   *     the OAuth redirect URL response.
   */
  this.initialAuthEvent_ = null;
  /**
   * @private {!Array<!function(?fireauth.AuthEvent)>} The Auth event
   *     listeners.
   */
  this.authEventListeners_ = [];
  /** @private {number} The initial Auth event timeout. */
  this.initialTimeout_ = initialTimeout ||
      fireauth.CordovaHandler.INITIAL_TIMEOUT_MS_;
  /** @private {number} The return to app after redirect timeout. */
  this.redirectTimeout_ = redirectTimeout ||
      fireauth.CordovaHandler.REDIRECT_TIMEOUT_MS_;
  /**
   * @private {?goog.Promise} The last pending redirect promise. This is null if
   *     already completed.
   */
  this.pendingRedirect_ = null;
  /**
   * @private {?Object} The inAppBrowser reference window if available. This is
   *     relevant to iOS 7 and 8 embedded webviews.
   */
  this.inAppBrowserRef_ = null;
};


/**
 * The total number of chars used to generate the session ID string.
 * @const {number}
 * @private
 */
fireauth.CordovaHandler.SESSION_ID_TOTAL_CHARS_ = 20;


/**
 * The default initial Auth event timeout in ms.
 * @const {number}
 * @private
 */
fireauth.CordovaHandler.INITIAL_TIMEOUT_MS_ = 500;


/**
 * The default timeout in milliseconds for a pending redirect operation after
 * returning to the app.
 * @const {number}
 * @private
 */
fireauth.CordovaHandler.REDIRECT_TIMEOUT_MS_ = 2000;


/**
 * Constructs a Cordova configuration error message.
 * @param {?string=} opt_message The optional error message to be used. This
 *     will override the existing default one.
 * @return {!fireauth.AuthError} The Cordova invalid configuration error with
 *     the custom message provided. If no message is provided, the default
 *     message is used.
 * @private
 */
fireauth.CordovaHandler.getError_ = function(opt_message) {
  return new fireauth.AuthError(
      fireauth.authenum.Error.INVALID_CORDOVA_CONFIGURATION,
      opt_message);
};


/**
 * Initializes the Cordova environment and waits for it to be ready.
 * @return {!goog.Promise} A promise that resolves if the current environment is
 *     a Cordova environment.
 * @override
 */
fireauth.CordovaHandler.prototype.initializeAndWait = function() {
  if (this.isReady_) {
    return this.isReady_;
  }
  this.isReady_ = fireauth.util.checkIfCordova().then(function() {
    // Check all dependencies installed.
    // Note that cordova-universal-links-plugin has been abandoned.
    // A fork with latest fixes is available at:
    // https://www.npmjs.com/package/cordova-universal-links-plugin-fix
    var subscribe = fireauth.util.getObjectRef(
        'universalLinks.subscribe', goog.global);
    if (typeof subscribe !== 'function') {
      throw fireauth.CordovaHandler.getError_(
          'cordova-universal-links-plugin-fix is not installed');
    }
    // https://www.npmjs.com/package/cordova-plugin-buildinfo
    var appIdentifier =
        fireauth.util.getObjectRef('BuildInfo.packageName', goog.global);
    if (typeof appIdentifier === 'undefined') {
      throw fireauth.CordovaHandler.getError_(
          'cordova-plugin-buildinfo is not installed');
    }
    // https://github.com/google/cordova-plugin-browsertab
    var openUrl = fireauth.util.getObjectRef(
        'cordova.plugins.browsertab.openUrl', goog.global);
    if (typeof openUrl !== 'function') {
      throw fireauth.CordovaHandler.getError_(
          'cordova-plugin-browsertab is not installed');
    }
    // https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-inappbrowser/
    var openInAppBrowser = fireauth.util.getObjectRef(
        'cordova.InAppBrowser.open', goog.global);
    if (typeof openInAppBrowser !== 'function') {
      throw fireauth.CordovaHandler.getError_(
          'cordova-plugin-inappbrowser is not installed');
    }
  }, function(error) {
    // If not supported.
    throw new fireauth.AuthError(fireauth.authenum.Error.CORDOVA_NOT_READY);
  });
  return this.isReady_;
};


/**
 * Generates a session ID. Used to prevent session fixation attacks.
 * @param {number} numOfChars The number of characters to generate.
 * @return {string} The generated session ID.
 * @private
 */
fireauth.CordovaHandler.prototype.generateSessionId_ = function(numOfChars) {
  var chars = [];
  var allowedChars =
      '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  while (numOfChars > 0) {
    var index = Math.floor(Math.random() * allowedChars.length);
    chars.push(allowedChars.charAt(index));
    numOfChars--;
  }
  return chars.join('');
};


/**
 * Computes the sha256 hash of a session ID.
 * @param {string} str The string to hash.
 * @return {string} The hashed string.
 * @private
 */
fireauth.CordovaHandler.prototype.computeSecureHash_ = function(str) {
  // sha256 the sessionId. This will be passed to the OAuth backend.
  // When exchanging the Auth code with a firebase ID token, the raw session ID
  // needs to be provided.
  var sha256 = new goog.crypt.Sha256();
  sha256.update(str);
  return goog.crypt.byteArrayToHex(sha256.digest());
};


/**
 * Waits for popup window to close and time out if the result is unhandled.
 * This is not supported in Cordova.
 * @param {!Window} popupWin The popup window.
 * @param {!function(!fireauth.AuthError)} onError The on error callback.
 * @return {!goog.Promise}
 * @override
 */
fireauth.CordovaHandler.prototype.startPopupTimeout =
    function(popupWin, onError, timeoutDuration) {
  // Not supported operation, check processPopup for details.
  onError(new fireauth.AuthError(
      fireauth.authenum.Error.OPERATION_NOT_SUPPORTED));
  return goog.Promise.resolve();
};


/**
 * Processes the popup request. This is not supported in Cordova.
 * @param {?Window} popupWin The popup window reference.
 * @param {!fireauth.AuthEvent.Type} mode The Auth event type.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @param {function()} onInitialize The function to call on initialization.
 * @param {function(*)} onError The function to call on error.
 * @param {string=} opt_eventId The optional event ID.
 * @param {boolean=} opt_alreadyRedirected Whether popup is already redirected
 *     to final destination.
 * @param {?string=} opt_tenantId The optional tenant ID.
 * @return {!goog.Promise} The popup window promise.
 * @override
 */
fireauth.CordovaHandler.prototype.processPopup = function(
    popupWin,
    mode,
    provider,
    onInitialize,
    onError,
    opt_eventId,
    opt_alreadyRedirected,
    opt_tenantId) {
  // Popups not supported in Cordova as the activity could be destroyed in
  // some cases. Redirect works better as getRedirectResult can be used as a
  // fallback to get the result when the activity is detroyed.
  return goog.Promise.reject(new fireauth.AuthError(
      fireauth.authenum.Error.OPERATION_NOT_SUPPORTED));
};


/**
 * @return {boolean} Whether the handler will unload the current page on
 *     redirect operations.
 * @override
 */
fireauth.CordovaHandler.prototype.unloadsOnRedirect = function() {
  // Does not necessarily unload the page on redirect.
  return false;
};


/**
 * @return {boolean} Whether the handler should be initialized early.
 * @override
 */
fireauth.CordovaHandler.prototype.shouldBeInitializedEarly = function() {
  // Initialize early to detect incoming link. This is not an expensive
  // operation, unlike embedding an iframe.
  return true;
};


/**
 * @return {boolean} Whether the sign-in handler in the current environment
 *     has volatile session storage.
 * @override
 */
fireauth.CordovaHandler.prototype.hasVolatileStorage = function() {
  // An activity can be destroyed and thereby sessionStorage wiped out.
  return true;
};


/**
 * Processes the OAuth redirect request. Will resolve when the OAuth response
 * is detected in the incoming link and the corresponding Auth event is
 * triggered.
 * @param {!fireauth.AuthEvent.Type} mode The Auth event type.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @param {?string=} opt_eventId The optional event ID.
 * @param {?string=} opt_tenantId The optional tenant ID.
 * @return {!goog.Promise}
 * @override
 */
fireauth.CordovaHandler.prototype.processRedirect = function(
    mode,
    provider,
    opt_eventId,
    opt_tenantId) {
  // If there is already a pending redirect, throw an error.
  if (this.pendingRedirect_) {
    return goog.Promise.reject(new fireauth.AuthError(
        fireauth.authenum.Error.REDIRECT_OPERATION_PENDING));
  }
  var self = this;
  var doc = goog.global.document;
  // On close timer promise.
  var onClose = null;
  // Auth event detection callback;
  var authEventCallback = null;
  // On resume (return from the redirect operation).
  var onResume = null;
  // On visibility change used to detect return to app in certain versions,
  // currently iOS.
  var onVisibilityChange = null;
  // When the processRedirect promise completes, clean up any remaining
  // temporary listeners and timers.
  var cleanup = function() {
    // Remove current resume listener.
    if (onResume) {
      doc.removeEventListener('resume', onResume, false);
    }
    // Remove visibility change listener.
    if (onVisibilityChange) {
      doc.removeEventListener('visibilitychange', onVisibilityChange, false);
    }
    // Cancel onClose promise if not already cancelled.
    if (onClose) {
      onClose.cancel();
    }
    // Remove Auth event callback.
    if (authEventCallback) {
      self.removeAuthEventListener(authEventCallback);
    }
    // Clear any pending redirect now that it is completed.
    self.pendingRedirect_ = null;
  };
  // Save the pending redirect promise and clear it on completion.
  this.pendingRedirect_ = goog.Promise.resolve().then(function() {
    // Validate provider.
    // Fail fast in this case.
    fireauth.AuthProvider.checkIfOAuthSupported(provider);
    return self.getInitialAuthEvent_();
  }).then(function() {
    return self.processRedirectInternal_(
        mode, provider, opt_eventId, opt_tenantId);
  }).then(function() {
    // Wait for result (universal link) before resolving this operation.
    // This ensures that if the activity is not destroyed, we can still
    // return the result of this operation.
    return new goog.Promise(function(resolve, reject) {
      /**
       * @param {?fireauth.AuthEvent} event The Auth event detected.
       * @return {boolean}
       */
      authEventCallback = function(event) {
        // Auth event detected, resolve promise.
        // Close SFSVC if still open.
        var closeBrowsertab = fireauth.util.getObjectRef(
            'cordova.plugins.browsertab.close', goog.global);
        resolve();
        // Close the SFSVC if it is still open (iOS 9+).
        if (typeof closeBrowsertab === 'function') {
          closeBrowsertab();
        }
        // Close inappbrowser emebedded webview in iOS7 and 8 case if still
        // open.
        if (self.inAppBrowserRef_ &&
            typeof self.inAppBrowserRef_['close'] === 'function') {
          self.inAppBrowserRef_['close']();
          // Reset reference.
          self.inAppBrowserRef_ = null;
        }
        return false;
      };
      // Wait and listen for the operation to complete (Auth event would
      // trigger).
      self.addAuthEventListener(authEventCallback);
      // On resume (return from the redirect operation).
      onResume = function() {
        // Already resumed. Do not run again.
        if (onClose) {
          return;
        }
        // Wait for some time before throwing the error that the flow was
        // cancelled by the user.
        onClose = goog.Timer.promise(self.redirectTimeout_).then(function() {
          // Throw the redirect cancelled by user error.
          reject(new fireauth.AuthError(
              fireauth.authenum.Error.REDIRECT_CANCELLED_BY_USER));
        });
      };
      onVisibilityChange = function() {
        // If app is visible, run onResume. Otherwise, ignore.
        if (fireauth.util.isAppVisible()) {
          onResume();
        }
      };
      // Listen to resume event (will trigger when the user returns to the app).
      doc.addEventListener('resume', onResume, false);
      // Listen to visibility change. This is used for iOS Cordova Safari 7+.
      // Does not work in Android stock browser versions older than 4.4.
      // We rely on resume event in Android as it works reliably in all
      // versions.
      if (!fireauth.util.isAndroid()) {
        doc.addEventListener('visibilitychange', onVisibilityChange, false);
      }
    }).thenCatch(function(error) {
      // Remove any pending partial event.
      return self.getPartialStoredEvent_().then(function() {
        throw error;
      });
    });
  }).thenAlways(cleanup);
  // Return the pending redirect promise.
  return this.pendingRedirect_;
};

/**
 * Processes the OAuth redirect request.
 * @param {!fireauth.AuthEvent.Type} mode The Auth event type.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @param {?string=} opt_eventId The optional event ID.
 * @param {?string=} opt_tenantId The optional tenant ID.
 * @return {!goog.Promise}
 * @private
 */
fireauth.CordovaHandler.prototype.processRedirectInternal_ = function(
    mode,
    provider,
    opt_eventId,
    opt_tenantId) {
  var self = this;
  // https://github.com/google/cordova-plugin-browsertab
  // Opens chrome custom tab in Android if chrome is installed,
  // SFSafariViewController in iOS if supported.
  // If the above are not supported, opens the system browser.
  // Opening a system browser could result in an app being rejected in the App
  // Store. The only solution here is to use an insecure embedded UIWebView.
  // This applies to older iOS versions 8 and under.
  // Generate a random session ID.
  var sessionId = this.generateSessionId_(
      fireauth.CordovaHandler.SESSION_ID_TOTAL_CHARS_);
  // Create the partial Auth event.
  var event = new fireauth.AuthEvent(
      mode,
      opt_eventId,
      null,
      sessionId,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT),
      null,
      opt_tenantId);
  // Use buildinfo package to get app metadata.
  // https://www.npmjs.com/package/cordova-plugin-buildinfo
  // Get app identifier.
  var appIdentifier =
      fireauth.util.getObjectRef('BuildInfo.packageName', goog.global);
  // initializeAndWait will ensure this does not happen.
  if (typeof appIdentifier !== 'string') {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.INVALID_CORDOVA_CONFIGURATION);
  }
  // Get app display name.
  var appDisplayName =
      fireauth.util.getObjectRef('BuildInfo.displayName', goog.global);
  // Construct additional params to pass to OAuth handler.
  var additionalParams  = {};
  // Append app identifier.
  if (fireauth.util.isIOS()) {
    // iOS app.
    additionalParams['ibi'] = appIdentifier;
  } else if (fireauth.util.isAndroid()) {
    // Android app.
    additionalParams['apn'] = appIdentifier;
  } else {
    // This should not happen as Cordova handler should not even be used in this
    // case.
    return goog.Promise.reject(new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED));
  }
  // Pass app display name.
  if (appDisplayName) {
    additionalParams['appDisplayName'] = appDisplayName;
  }
  // Hash the session ID and pass it to additional params.
  var hashedSessionId = this.computeSecureHash_(sessionId);
  // Append session ID.
  additionalParams['sessionId'] = hashedSessionId;
  // Construct OAuth handler URL.
  var oauthHelperWidgetUrl =
      fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
          this.authDomain_,
          this.apiKey_,
          this.appName_,
          mode,
          provider,
          null,
          opt_eventId,
          this.clientVersion_,
          additionalParams,
          this.endpointId_,
          opt_tenantId,
          this.emulatorConfig_);
  // Make sure handler initialized and ready.
  // This should also ensure all plugins are installed.
  return this.initializeAndWait().then(function() {
    // Save partial Auth event.
    return self.savePartialEventManager_.setAuthEvent(self.storageKey_, event);
  }).then(function() {
    // initializeAndWait will ensure this plugin is installed.
    var isAvailable = /** @type {!function(!function(*))} */ (
        fireauth.util.getObjectRef(
            'cordova.plugins.browsertab.isAvailable', goog.global));
    if (typeof isAvailable !== 'function') {
      throw new fireauth.AuthError(
          fireauth.authenum.Error.INVALID_CORDOVA_CONFIGURATION);
    }
    var openUrl = null;
    // Check if browsertab is supported.
    isAvailable(function(result) {
      if (result) {
        // browsertab supported.
        openUrl = /** @type {!function(string, ...*)} */ (
            fireauth.util.getObjectRef(
                'cordova.plugins.browsertab.openUrl', goog.global));
        if (typeof openUrl !== 'function') {
          throw new fireauth.AuthError(
              fireauth.authenum.Error.INVALID_CORDOVA_CONFIGURATION);
        }
        // Open OAuth handler.
        openUrl(oauthHelperWidgetUrl);
      } else {
        // browsertab not supported, switch to inappbrowser.
        openUrl = /** @type {!function(string, string, string=)} */ (
            fireauth.util.getObjectRef(
                'cordova.InAppBrowser.open', goog.global));
        if (typeof openUrl !== 'function') {
          throw new fireauth.AuthError(
              fireauth.authenum.Error.INVALID_CORDOVA_CONFIGURATION);
        }
        // Open in embedded webview for iOS 7 and 8 as Apple rejects apps that
        // switch context.
        // _blank opens an embedded webview.
        // _system opens the system browser.
        // _system (opens a system browser) is used as a fallback when
        // browsertab plugin is unable to open a chromecustomtab or SFSVC.
        // This has to exclude all iOS older versions where switching to a
        // browser is frowned upon by Apple and embedding a UIWebView is the
        // only option but is insecure and deprecated by Google for OAuth
        // sign-in. This will be applicable in old versions of Android.
        self.inAppBrowserRef_ = openUrl(
            oauthHelperWidgetUrl,
            fireauth.util.isIOS7Or8() ? '_blank' : '_system',
            'location=yes');
      }
    });
  });
};


/**
 * Dispatches the detected Auth event to all subscribed listeners.
 * @param {!fireauth.AuthEvent} event A detected Auth event.
 * @private
 */
fireauth.CordovaHandler.prototype.dispatchEvent_ = function(event) {
  for (var i = 0; i < this.authEventListeners_.length; i++) {
    try {
      this.authEventListeners_[i](event);
    } catch (e) {
      // If any handler fails, ignore and run next handler.
    }
  }
};


/**
 * Resolves the first redirect Auth event and caches it.
 * @return {!goog.Promise<!fireauth.AuthEvent>} A promise that resolves with the
 *     initial Auth event response from a redirect operation. Initializes the
 *     internal Auth event listener which will dispatch Auth events to all
 *     subscribed listeners.
 * @private
 */
fireauth.CordovaHandler.prototype.getInitialAuthEvent_ = function() {
  var self = this;
  if (!this.initialAuthEvent_) {
    // Cache this result so on next call, it is not triggered again.
    this.initialAuthEvent_ = this.initializeAndWait().then(function() {
      return new goog.Promise(function(resolve, reject) {
        /**
         * @param {?fireauth.AuthEvent} event The Auth event detected.
         * @return {boolean}
         */
        var authEventCallback = function(event) {
          resolve(event);
          // Remove on completion.
          self.removeAuthEventListener(authEventCallback);
          return false;
        };
        // Listen to Auth events. If resolved, resolve promise.
        self.addAuthEventListener(authEventCallback);
        // This should succeed as initializeAndWait should guarantee plugins are
        // ready.
        self.setAuthEventListener_();
      });
    });
  }
  return this.initialAuthEvent_;
};


/**
 * Gets and deletes the current stored partial event from storage.
 * @return {!goog.Promise<?fireauth.AuthEvent>} A promise that resolves with the
 *     stored Auth event.
 * @private
 */
fireauth.CordovaHandler.prototype.getPartialStoredEvent_ = function() {
  var event = null;
  var self = this;
  // Get any saved partial Auth event.
  return this.getAndDeletePartialEventManager_.getAuthEvent()
    .then(function(authEvent) {
      // Save partial event locally.
      event = authEvent;
      // Delete partial event.
      return self.getAndDeletePartialEventManager_.removeAuthEvent();
    }).then(function() {
      // Return the locally saved partial event.
      return event;
    });
};


/**
 * Extracts the Auth event pertaining to the incoming URL.
 * @param {!fireauth.AuthEvent} partialEvent The partial Auth event.
 * @param {string} url The incoming universal link.
 * @return {?fireauth.AuthEvent} The resolved Auth event corresponding to the
 *     callback URL. This is null if no event is found.
 * @private
 */
fireauth.CordovaHandler.prototype.extractAuthEventFromUrl_ =
    function(partialEvent, url) {
  // Default no redirect event result.
  var authEvent = null;
  // Parse the deep link within the dynamic link URL.
  var callbackUrl = fireauth.DynamicLink.parseDeepLink(url);
  // Confirm it is actually a callback URL.
  // Currently the universal link will be of this format:
  // https://<AUTH_DOMAIN>/__/auth/callback<OAUTH_RESPONSE>
  // This is a fake URL but is not intended to take the user anywhere
  // and just redirect to the app.
  if (callbackUrl.indexOf('/__/auth/callback') != -1) {
    // Check if there is an error in the URL.
    // This mechanism is also used to pass errors back to the app:
    // https://<AUTH_DOMAIN>/__/auth/callback?firebaseError=<STRINGIFIED_ERROR>
    var uri = goog.Uri.parse(callbackUrl);
    // Get the error object corresponding to the stringified error if found.
    var errorObject = fireauth.util.parseJSON(
        uri.getParameterValue('firebaseError') || null);
    var error = typeof errorObject === 'object' ?
        fireauth.AuthError.fromPlainObject(
            /** @type {?Object} */ (errorObject)) :
        null;
    if (error) {
      // Construct the full failed Auth event.
      authEvent = new fireauth.AuthEvent(
          partialEvent.getType(),
          partialEvent.getEventId(),
          null,
          null,
          error,
          null,
          partialEvent.getTenantId());
    } else {
      // Construct the full successful Auth event.
      authEvent = new fireauth.AuthEvent(
          partialEvent.getType(),
          partialEvent.getEventId(),
          callbackUrl,
          partialEvent.getSessionId(),
          null,
          null,
          partialEvent.getTenantId());
    }
  }
  return authEvent;
};


/**
 * Sets the internal Auth event listener. This listens to incoming universal
 * links and on detection, repackages them into an Auth event and then
 * dispatches the events in all event listeners.
 * @private
 */
fireauth.CordovaHandler.prototype.setAuthEventListener_ = function() {
  // https://github.com/nordnet/cordova-universal-links-plugin-fix
  var self = this;
  // Default no redirect event result.
  var noEvent = new fireauth.AuthEvent(
      fireauth.AuthEvent.Type.UNKNOWN,
      null,
      null,
      null,
      new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
  var initialResolve = false;
  // On initialization, if no incoming universal link detected, trigger
  // no Auth event (no redirect operation previously called) after waiting
  // for a short period of time.
  var noEventTimer = goog.Timer.promise(this.initialTimeout_).then(function() {
    // Delete any pending unhandled event.
    return self.getPartialStoredEvent_().then(function(event) {
      // On timeout trigger noEvent if not already resolved in link
      // subscriber.
      if (!initialResolve) {
        self.dispatchEvent_(noEvent);
      }
    });
  });
  // No event name needed, subscribe to all incoming universal links.
  var universalLinkCb = function(eventData) {
    initialResolve = true;
    // Cancel no event timer.
    if (noEventTimer) {
      noEventTimer.cancel();
    }
    // Incoming link detected.
    // Check for any stored partial event.
    self.getPartialStoredEvent_().then(function(event) {
      // Initialize to an unknown event.
      var authEvent = noEvent;
      // Confirm OAuth response included.
      if (event && eventData && eventData['url']) {
        // Construct complete event. Default to unknown event if none found.
        authEvent = self.extractAuthEventFromUrl_(event, eventData['url']) ||
            noEvent;
      }
      // Dispatch Auth event.
      self.dispatchEvent_(authEvent);
    });
  };
  // iOS 7 or 8 custom URL schemes.
  // This is also the current default behavior for iOS 9+.
  // For this to work, cordova-plugin-customurlscheme needs to be installed.
  // https://github.com/EddyVerbruggen/Custom-URL-scheme
  // Do not overwrite the existing developer's URL handler.
  var existingHandlerOpenURL = goog.global['handleOpenURL'];
  goog.global['handleOpenURL'] = function(url) {
    var appIdentifier =
        fireauth.util.getObjectRef('BuildInfo.packageName', goog.global);
    // Apply case insensitive match. While bundle IDs are case sensitive,
    // when creating a new app, Apple verifies the Bundle ID using
    // case-insensitive search. So it is not possible that an app in the app
    // store try to impersonate another one by lower/upper casing characters.
    if (url.toLowerCase().indexOf(appIdentifier.toLowerCase() + '://') == 0) {
      universalLinkCb({
        'url': url
      });
    }
    // Call the developer's handler if it is present.
    if (typeof existingHandlerOpenURL === 'function') {
      try {
        existingHandlerOpenURL(url);
      } catch(e) {
        // This doesn't swallow the error but also does not interrupt the flow.
        console.error(e);
      }
    }
  };
  fireauth.UniversalLinkSubscriber.getInstance().subscribe(universalLinkCb);
};


/**
 * @param {!function(?fireauth.AuthEvent):boolean} listener The Auth event
 *     listener to add.
 * @override
 */
fireauth.CordovaHandler.prototype.addAuthEventListener = function(listener) {
  // TODO: consider creating an abstract base class that OAuth handlers
  // extend with add, remove Auth event listeners and dispatcher methods.
  this.authEventListeners_.push(listener);
  // Set internal listener to Auth events. This will be ignored on subsequent
  // calls.
  this.getInitialAuthEvent_().thenCatch(function(error) {
    // Suppress this error as it should be caught through other actionable
    // public methods.
    // This would typically happen on invalid Cordova setup, when the OAuth
    // plugins are not installed. This should still trigger the Auth event
    // as developers are not forced to use OAuth sign-in in their Cordova app.
    // This is needed for onAuthStateChanged listener to trigger initially.
    if (error.code === 'auth/invalid-cordova-configuration') {
      var noEvent = new fireauth.AuthEvent(
          fireauth.AuthEvent.Type.UNKNOWN,
          null,
          null,
          null,
          new fireauth.AuthError(fireauth.authenum.Error.NO_AUTH_EVENT));
      listener(noEvent);
    }
  });
};


/**
 * @param {!function(?fireauth.AuthEvent):boolean} listener The Auth event
 *     listener to remove.
 * @override
 */
fireauth.CordovaHandler.prototype.removeAuthEventListener = function(listener) {
  goog.array.removeAllIf(this.authEventListeners_, function(ele) {
    return ele == listener;
  });
};

