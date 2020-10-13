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
 * @fileoverview Defines the Auth event manager instance.
 */

goog.provide('fireauth.AuthEventHandler');
goog.provide('fireauth.AuthEventManager');
goog.provide('fireauth.AuthEventManager.Result');
goog.provide('fireauth.PopupAuthEventProcessor');
goog.provide('fireauth.RedirectAuthEventProcessor');

goog.require('fireauth.AuthCredential');
goog.require('fireauth.AuthError');
goog.require('fireauth.AuthEvent');
goog.require('fireauth.CordovaHandler');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.constants');
goog.require('fireauth.iframeclient.IfcHandler');
goog.require('fireauth.storage.PendingRedirectManager');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Timer');
goog.require('goog.array');


/**
 * Initializes the Auth event manager which provides the mechanism to connect
 * external Auth events to their corresponding listeners.
 * @param {string} authDomain The Firebase authDomain used to determine the
 *     OAuth helper page domain.
 * @param {string} apiKey The API key for sending backend Auth requests.
 * @param {string} appName The App ID for the Auth instance that triggered this
 *     request.
 *  @param {?fireauth.constants.EmulatorSettings=} emulatorConfig The emulator
 *     configuration.
 * @constructor
 */
fireauth.AuthEventManager = function(authDomain, apiKey, appName, emulatorConfig) {
  /**
   * @private {!Object<string, boolean>} The map of processed auth event IDs.
   */
  this.processedEvents_ = {};
  /** @private {number} The last saved processed event time in milliseconds. */
  this.lastProcessedEventTime_ = 0;
  /** @private {string} The Auth domain. */
  this.authDomain_ = authDomain;
  /** @private {string} The browser API key. */
  this.apiKey_ = apiKey;
  /** @private {string} The App name. */
  this.appName_ = appName;
  /** @private @const {?fireauth.constants.EmulatorSettings|undefined} The emulator config. */
  this.emulatorConfig_ = emulatorConfig;
  /**
   * @private {!Array<!fireauth.AuthEventHandler>} List of subscribed handlers.
   */
  this.subscribedHandlers_ = [];
  /**
   * @private {boolean} Whether the Auth event manager instance is initialized.
   */
  this.initialized_ = false;
  /** @private {function(?fireauth.AuthEvent)} The Auth event handler. */
  this.authEventHandler_ = goog.bind(this.handleAuthEvent_, this);
  /** @private {!fireauth.RedirectAuthEventProcessor} The redirect event
   *      processor. */
  this.redirectAuthEventProcessor_ =
      new fireauth.RedirectAuthEventProcessor(this);
  /** @private {!fireauth.PopupAuthEventProcessor} The popup event processor. */
  this.popupAuthEventProcessor_ = new fireauth.PopupAuthEventProcessor(this);
  /**
   * @private {!fireauth.storage.PendingRedirectManager} The pending redirect
   *     storage manager instance.
   */
  this.pendingRedirectStorageManager_ =
      new fireauth.storage.PendingRedirectManager(
          fireauth.AuthEventManager.getKey_(this.apiKey_, this.appName_));

  /**
   * @private {!Object.<!fireauth.AuthEvent.Type, !fireauth.AuthEventProcessor>}
   *     Map containing Firebase event processor instances keyed by event type.
   */
  this.typeToManager_ = {};
  this.typeToManager_[fireauth.AuthEvent.Type.UNKNOWN] =
      this.redirectAuthEventProcessor_;
  this.typeToManager_[fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT] =
      this.redirectAuthEventProcessor_;
  this.typeToManager_[fireauth.AuthEvent.Type.LINK_VIA_REDIRECT] =
      this.redirectAuthEventProcessor_;
  this.typeToManager_[fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT] =
      this.redirectAuthEventProcessor_;
  this.typeToManager_[fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP] =
      this.popupAuthEventProcessor_;
  this.typeToManager_[fireauth.AuthEvent.Type.LINK_VIA_POPUP] =
      this.popupAuthEventProcessor_;
  this.typeToManager_[fireauth.AuthEvent.Type.REAUTH_VIA_POPUP] =
      this.popupAuthEventProcessor_;
  /**
   * @private {!fireauth.OAuthSignInHandler} The OAuth sign in handler depending
   *     on the current environment.
   */
  this.oauthSignInHandler_ =
      fireauth.AuthEventManager.instantiateOAuthSignInHandler(
        this.authDomain_,
        this.apiKey_,
        this.appName_,
        firebase.SDK_VERSION || null,
        fireauth.constants.clientEndpoint,
        this.emulatorConfig_);
};


/**
 * @const {number} The number of milliseconds since the last processed
 *     event before the event duplication cache is cleared. This is currently
 *     10 minutes.
 */
fireauth.AuthEventManager.EVENT_DUPLICATION_CACHE_DURATION = 10 * 60 * 1000;


/**
 * @return {!fireauth.RedirectAuthEventProcessor} The redirect event processor.
 */
fireauth.AuthEventManager.prototype.getRedirectAuthEventProcessor = function() {
  return this.redirectAuthEventProcessor_;
};


/** @return {!fireauth.PopupAuthEventProcessor} The popup event processor. */
fireauth.AuthEventManager.prototype.getPopupAuthEventProcessor = function() {
  return this.popupAuthEventProcessor_;
};


/**
 * Instantiates an OAuth sign-in handler depending on the current environment
 * and returns it.
 * @param {string} authDomain The Firebase authDomain used to determine the
 *     OAuth helper page domain.
 * @param {string} apiKey The API key for sending backend Auth requests.
 * @param {string} appName The App ID for the Auth instance that triggered this
 *     request.
 * @param {?string} version The SDK client version.
 * @param {?string=} opt_endpointId The endpoint ID (staging, test Gaia, etc).
 *  @param {?fireauth.constants.EmulatorSettings=} emulatorConfig The emulator
 *     configuration.
 * @return {!fireauth.OAuthSignInHandler} The OAuth sign in handler depending
 *     on the current environment.
 */
fireauth.AuthEventManager.instantiateOAuthSignInHandler =
    function(authDomain, apiKey, appName, version, opt_endpointId, emulatorConfig) {
  // This assumes that android/iOS file environment must be a Cordova
  // environment which is not true. This is the best way currently available
  // to instantiate this synchronously without waiting for checkIfCordova to
  // resolve. If it is determined that the Cordova was falsely detected, it will
  // be caught via actionable public popup and redirect methods.
  return fireauth.util.isAndroidOrIosCordovaScheme() ?
      new fireauth.CordovaHandler(
        authDomain,
        apiKey,
        appName,
        version,
        undefined,
        undefined,
        opt_endpointId,
        emulatorConfig) :
      new fireauth.iframeclient.IfcHandler(
        authDomain,
        apiKey,
        appName,
        version,
        opt_endpointId,
        emulatorConfig);
};


/** Reset iframe. This will require reinitializing it.*/
fireauth.AuthEventManager.prototype.reset = function() {
  // Reset initialized status. This will force a popup request to re-initialize
  // the iframe.
  this.initialized_ = false;
  // Remove any previous existing Auth event listener.
  this.oauthSignInHandler_.removeAuthEventListener(this.authEventHandler_);
  // Construct a new instance of OAuth sign in handler.

  this.oauthSignInHandler_ =
      fireauth.AuthEventManager.instantiateOAuthSignInHandler(
        this.authDomain_,
        this.apiKey_,
        this.appName_,
        firebase.SDK_VERSION || null,
        null,
        this.emulatorConfig_);
  this.processedEvents_ = {};
};


/**
 * Clears the cached redirect result as long as there is no pending redirect
 * result being processed. Unrecoverable errors will not be cleared.
 */
fireauth.AuthEventManager.prototype.clearRedirectResult = function() {
  this.redirectAuthEventProcessor_.clearRedirectResult();
};


/**
 * @typedef {{
 *   user: (?fireauth.AuthUser|undefined),
 *   credential: (?fireauth.AuthCredential|undefined),
 *   operationType: (?string|undefined),
 *   additionalUserInfo: (?fireauth.AdditionalUserInfo|undefined)
 * }}
 */
fireauth.AuthEventManager.Result;


/**
 * Whether to enable Auth event manager subscription.
 * @const {boolean}
 */
fireauth.AuthEventManager.ENABLED = true;


/**
 * Initializes the ifchandler and add Auth event listener on it.
 * @return {!goog.Promise} The promise that resolves when the iframe is ready.
 */
fireauth.AuthEventManager.prototype.initialize = function() {
  var self = this;
  // Initialize once.
  if (!this.initialized_) {
    this.initialized_ = true;
    // Listen to Auth events on iframe.
    this.oauthSignInHandler_.addAuthEventListener(this.authEventHandler_);
  }
  var previousOauthSignInHandler = this.oauthSignInHandler_;
  // This should initialize ifchandler underneath.
  // Return on OAuth handler ready promise.
  // Check for error in ifcHandler used to embed the iframe.
  return this.oauthSignInHandler_.initializeAndWait()
      .thenCatch(function(error) {
        // Force ifchandler to reinitialize on retrial.
        if (self.oauthSignInHandler_ == previousOauthSignInHandler) {
          // If a new OAuth sign in handler was already created, do not reset.
          self.reset();
        }
        throw error;
      });
};


/**
 * Called after it is determined that there is no pending redirect result.
 * Will populate the redirect result if it is guaranteed to be null and will
 * force an early initialization of the OAuth sign in handler if the
 * environment requires it.
 * @private
 */
fireauth.AuthEventManager.prototype.initializeWithNoPendingRedirectResult_ =
    function() {
  var self = this;
  // Check if the OAuth sign in handler should be initialized early in all
  // cases.
  if (this.oauthSignInHandler_.shouldBeInitializedEarly()) {
    this.initialize().thenCatch(function(error) {
      // Current environment was falsely detected as Cordova, trigger a fake
      // Auth event to notify getRedirectResult that operation is not supported.
      var notSupportedEvent = new fireauth.AuthEvent(
          fireauth.AuthEvent.Type.UNKNOWN,
          null,
          null,
          null,
          new fireauth.AuthError(
              fireauth.authenum.Error.OPERATION_NOT_SUPPORTED));
      if (fireauth.AuthEventManager.isCordovaFalsePositive_(
          /** @type {?fireauth.AuthError} */ (error))) {
        self.handleAuthEvent_(notSupportedEvent);
      }
    });
  }
  // For environments where storage is volatile, we can't determine that
  // there is no pending redirect response. This is true in Cordova
  // where an activity would be destroyed in some cases and the
  // sessionStorage is lost.
  if (!this.oauthSignInHandler_.hasVolatileStorage()) {
    // Since there is no redirect result, it is safe to default to empty
    // redirect result instead of blocking on this.
    // The downside here is that on iOS devices, calling signInWithPopup
    // after getRedirectResult resolves and the iframe does not finish
    // loading, the popup event propagating to the iframe would not be
    // detected. This is because in iOS devices, storage events only trigger
    // in iframes but are not actually saved in web storage. The iframe must
    // be embedded and ready before the storage event propagates. Otherwise
    // it won't be detected.
    this.redirectAuthEventProcessor_.defaultToEmptyResponse();
  }
};


/**
 * Subscribes an Auth event handler to list of handlers.
 * @param {!fireauth.AuthEventHandler} handler The instance to subscribe.
 */
fireauth.AuthEventManager.prototype.subscribe = function(handler) {
  if (!goog.array.contains(this.subscribedHandlers_, handler)) {
    this.subscribedHandlers_.push(handler);
  }
  if (this.initialized_) {
    return;
  }
  var self = this;
  // Check pending redirect status.
  this.pendingRedirectStorageManager_.getPendingStatus()
      .then(function(status) {
    // Pending redirect detected.
    if (status) {
      // Remove pending status and initialize.
      self.pendingRedirectStorageManager_.removePendingStatus()
          .then(function() {
            self.initialize().thenCatch(function(error) {
              // Current environment was falsely detected as Cordova, trigger a
              // fake Auth event to notify getRedirectResult that operation is
              // not supported.
              var notSupportedEvent = new fireauth.AuthEvent(
                 fireauth.AuthEvent.Type.UNKNOWN,
                 null,
                 null,
                 null,
                 new fireauth.AuthError(
                     fireauth.authenum.Error.OPERATION_NOT_SUPPORTED));
              if (fireauth.AuthEventManager.isCordovaFalsePositive_(
                  /** @type {?fireauth.AuthError} */ (error))) {
                self.handleAuthEvent_(notSupportedEvent);
              }
            });
          });
    } else {
      // No previous redirect, default to empty response.
      self.initializeWithNoPendingRedirectResult_();
    }
  }).thenCatch(function(error) {
    // Error checking pending status, default to empty response.
    self.initializeWithNoPendingRedirectResult_();
  });
};


/**
 * @param {!fireauth.AuthEventHandler} handler The possible subscriber.
 * @return {boolean} Whether the handle is subscribed.
 */
fireauth.AuthEventManager.prototype.isSubscribed = function(handler) {
  return goog.array.contains(this.subscribedHandlers_, handler);
};


/**
 * Unsubscribes an Auth event handler to list of handlers.
 * @param {!fireauth.AuthEventHandler} handler The instance to unsubscribe.
 */
fireauth.AuthEventManager.prototype.unsubscribe = function(handler) {
  goog.array.removeAllIf(this.subscribedHandlers_, function(ele) {
    return ele == handler;
  });
};


/**
 * @param {?fireauth.AuthEvent} authEvent External Auth event to check.
 * @return {boolean} Whether the event was previously processed.
 * @private
 */
fireauth.AuthEventManager.prototype.hasProcessedAuthEvent_ =
    function(authEvent) {
  // Prevent duplicate event tracker from growing too large.
  if (goog.now() - this.lastProcessedEventTime_ >=
      fireauth.AuthEventManager.EVENT_DUPLICATION_CACHE_DURATION) {
    this.processedEvents_ = {};
    this.lastProcessedEventTime_ = 0;
  }
  if (authEvent && authEvent.getUid() &&
      this.processedEvents_.hasOwnProperty(authEvent.getUid())) {
    // If event is already processed, ignore it.
    return true;
  }
  return false;
};


/**
 * Saves the provided event uid to prevent processing duplication.
 * @param {?fireauth.AuthEvent} authEvent External Auth event to track in
 *     processed list of events.
 * @private
 */
fireauth.AuthEventManager.prototype.saveProcessedAuthEvent_ =
    function(authEvent) {
  if (authEvent &&
      (authEvent.getSessionId() || authEvent.getEventId())) {
    // Save processed event ID. We keep the cache for 10 minutes to prevent it
    // from growing too large.
    this.processedEvents_[
        /** @type {string} */ (authEvent.getUid())] = true;
    // Save last processing time.
    this.lastProcessedEventTime_ = goog.now();
  }
};


/**
 * Handles external Auth event detected by the OAuth sign-in handler.
 * @param {?fireauth.AuthEvent} authEvent External Auth event detected by
 *     iframe.
 * @return {boolean} Whether the event found an appropriate owner that can
 *     handle it. This signals to the OAuth helper iframe that the event is safe
 *     to delete.
 * @private
 */
fireauth.AuthEventManager.prototype.handleAuthEvent_ = function(authEvent) {
  // This should not happen as fireauth.iframe.AuthRelay will not send null
  // events.
  if (!authEvent) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT);
  }
  if (this.hasProcessedAuthEvent_(authEvent)) {
    // If event is already processed, ignore it.
    return false;
  }
  // Initialize event processed status to false. When set to false, the event is
  // not clear to delete in the OAuth helper iframe as the owner of this event
  // could be a user in another tab.
  var processed = false;
  // Lookup a potential handler for this event.
  for (var i = 0; i < this.subscribedHandlers_.length; i++) {
    var potentialHandler = this.subscribedHandlers_[i];
    if (potentialHandler.canHandleAuthEvent(
        authEvent.getType(), authEvent.getEventId())) {
      var eventManager = this.typeToManager_[authEvent.getType()];
      if (eventManager) {
        eventManager.processAuthEvent(authEvent, potentialHandler);
        // Prevent events with event IDs or session IDs from duplicate
        // processing.
        this.saveProcessedAuthEvent_(authEvent);
      }
      // Event has been processed, free to clear in OAuth helper.
      processed = true;
      break;
    }
  }
  // If no redirect response ready yet, default to an empty response.
  this.redirectAuthEventProcessor_.defaultToEmptyResponse();
  // Notify iframe of processed status.
  return processed;
};


/**
 * The popup promise timeout delay with units in ms between the time the iframe
 * is ready (successfully embedded on the page) and the time the popup Auth
 * event is detected in the parent container.
 * @const {!fireauth.util.Delay}
 * @private
 */
fireauth.AuthEventManager.POPUP_TIMEOUT_MS_ =
    new fireauth.util.Delay(2000, 10000);


/**
 * The redirect promise timeout delay with units in ms. Unlike the popup
 * timeout, this covers the entire duration from start to getRedirectResult
 * resolution.
 * @const {!fireauth.util.Delay}
 * @private
 */
fireauth.AuthEventManager.REDIRECT_TIMEOUT_MS_ =
    new fireauth.util.Delay(30000, 60000);


/**
 * Returns the redirect result. If coming back from a successful redirect sign
 * in, will resolve to the signed in user. If coming back from an unsuccessful
 * redirect sign, will reject with the proper error. If no redirect operation
 * called, resolves with null.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.AuthEventManager.prototype.getRedirectResult = function() {
  return this.redirectAuthEventProcessor_.getRedirectResult();
};


/**
 * Processes the popup request. The popup instance must be provided externally
 * and on error, the requestor must close the window.
 * @param {?Window} popupWin The popup window reference.
 * @param {!fireauth.AuthEvent.Type} mode The Auth event type.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @param {string=} opt_eventId The optional event ID.
 * @param {boolean=} opt_alreadyRedirected Whether popup is already redirected
 *     to final destination.
 * @param {?string=} opt_tenantId The optional tenant ID.
 * @return {!goog.Promise} The popup window promise.
 */
fireauth.AuthEventManager.prototype.processPopup =
    function(popupWin, mode, provider, opt_eventId, opt_alreadyRedirected,
             opt_tenantId) {
  var self = this;
  return this.oauthSignInHandler_.processPopup(
      popupWin,
      mode,
      provider,
      // On initialization, add Auth event listener if not already added.
      function() {
        if (!self.initialized_) {
          self.initialized_ = true;
          // Listen to Auth events on iframe.
          self.oauthSignInHandler_.addAuthEventListener(self.authEventHandler_);
        }
      },
      // On error, reset to force re-initialization on retrial.
      function(error) {
        self.reset();
      },
      opt_eventId,
      opt_alreadyRedirected,
      opt_tenantId);
};


/**
 * @param {?fireauth.AuthError} error The error to check for Cordova false
 *     positive.
 * @return {boolean} Whether the current environment was falsely identified as
 *     Cordova.
 * @private
 */
fireauth.AuthEventManager.isCordovaFalsePositive_ = function(error) {
  if (error && error['code'] == 'auth/cordova-not-ready') {
    return true;
  }
  return false;
};


/**
 * Processes the redirect request.
 * @param {!fireauth.AuthEvent.Type} mode The Auth event type.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @param {string=} opt_eventId The optional event ID.
 * @param {?string=} opt_tenantId The optional tenant ID.
 * @return {!goog.Promise}
 */
fireauth.AuthEventManager.prototype.processRedirect =
    function(mode, provider, opt_eventId, opt_tenantId) {
  var self = this;
  var error;
  // Save pending status first.
  return this.pendingRedirectStorageManager_.setPendingStatus()
    .then(function() {
      // Try to redirect.
      return self.oauthSignInHandler_.processRedirect(
          mode, provider, opt_eventId, opt_tenantId)
        .thenCatch(function(e) {
          if (fireauth.AuthEventManager.isCordovaFalsePositive_(
              /** @type {?fireauth.AuthError} */ (e))) {
            throw new fireauth.AuthError(
                fireauth.authenum.Error.OPERATION_NOT_SUPPORTED);
          }
          // On failure, remove pending status and rethrow the error.
          error = e;
          return self.pendingRedirectStorageManager_.removePendingStatus()
            .then(function() {
              throw error;
            });
        })
        .then(function() {
          // Resolve, if the OAuth handler unloads the page on redirect.
          if (!self.oauthSignInHandler_.unloadsOnRedirect()) {
            // Relevant to Cordova case, will not matter in web case where
            // browser redirects.
            // In Cordova, the activity could still be running in the background
            // so we need to wait for getRedirectResult to resolve before
            // resolving this current promise.
            // Otherwise, if the activity is destroyed, getRedirectResult would
            // be used.
            // At this point, authEvent should have been triggered.
            // When this promise resolves, the developer should be able to
            // call getRedirectResult to get the result of this operation.
            // Remove pending status as result should be resolved.
            return self.pendingRedirectStorageManager_.removePendingStatus()
                .then(function() {
                  // Ensure redirect result ready before resolving.
                  return self.getRedirectResult();
                }).then(function(result) {
                  // Do nothing. Developer expected to call getRedirectResult to
                  // get result.
                }).thenCatch(function(error) {
                  // Do nothing. Developer expected to call getRedirectResult to
                  // get result.
                });
          } else {
            // For environments that will unload the page on redirect, keep
            // the promise pending on success. This makes it easier to reuse
            // the same code for Cordova environment and browser environment.
            // The developer can always add getRedirectResult on promise
            // resolution and expect that when it runs, the redirect operation
            // was completed.
            return new goog.Promise(function(resolve, reject) {
              // Keep this pending.
            });
          }
        });
    });
};


/**
 * Waits for popup window to close. When closed start timeout listener for popup
 * pending promise. If in the process, it was detected that the iframe does not
 * support web storage, the popup is closed and the web storage unsupported
 * error is thrown.
 * @param {!fireauth.AuthEventHandler} owner The owner of the event.
 * @param {!fireauth.AuthEvent.Type} mode The Auth event type.
 * @param {!Window} popupWin The popup window.
 * @param {?string=} opt_eventId The event ID.
 * @return {!goog.Promise}
 */
fireauth.AuthEventManager.prototype.startPopupTimeout =
    function(owner, mode, popupWin, opt_eventId) {
  return this.oauthSignInHandler_.startPopupTimeout(
      popupWin,
      // On popup error such as popup closed by user or web storage not
      // supported.
      function(error) {
        // Notify owner of the error.
        owner.resolvePendingPopupEvent(mode, null, error, opt_eventId);
      },
      fireauth.AuthEventManager.POPUP_TIMEOUT_MS_.get());
};



/**
 * @private {!Object.<string, !fireauth.AuthEventManager>} Map containing
 *     Firebase event manager instances keyed by Auth event manager ID.
 */
fireauth.AuthEventManager.manager_ = {};


/**
 * The separator for manager keys to concatenate app name and apiKey.
 * @const {string}
 * @private
 */
fireauth.AuthEventManager.KEY_SEPARATOR_ = ':';


/**
 * @param {string} apiKey The API key for sending backend Auth requests.
 * @param {string} appName The Auth instance that initiated the Auth event.
   * @param {?fireauth.constants.EmulatorSettings=} emulatorConfig The emulator
   *   configuration.
   * @return {string} The key identifying the Auth event manager instance.
   * @private
   */
fireauth.AuthEventManager.getKey_ = function(apiKey, appName, emulatorConfig) {
  var key = apiKey + fireauth.AuthEventManager.KEY_SEPARATOR_ + appName;
  if (emulatorConfig) {
    key = key + fireauth.AuthEventManager.KEY_SEPARATOR_ + emulatorConfig.url;
  }
  return key;
}


/**
 * @param {string} authDomain The Firebase authDomain used to determine the
 *     OAuth helper page domain.
 * @param {string} apiKey The API key for sending backend Auth requests.
 * @param {string} appName The Auth instance that initiated the Auth event
 *     manager.
 * @param {?fireauth.constants.EmulatorSettings=} emulatorConfig The emulator
 *     configuration.
 * @return {!fireauth.AuthEventManager} the requested manager instance.
 */
fireauth.AuthEventManager.getManager = function (authDomain, apiKey, appName, emulatorConfig) {
  // Construct storage key.
  var key = fireauth.AuthEventManager.getKey_(
    apiKey,
    appName,
    emulatorConfig
  );
  if (!fireauth.AuthEventManager.manager_[key]) {
    fireauth.AuthEventManager.manager_[key] =
      new fireauth.AuthEventManager(
        authDomain,
        apiKey,
        appName,
        emulatorConfig
      );
  }
  return fireauth.AuthEventManager.manager_[key];
};


/**
 * The interface that represents a specific type of Auth event processor.
 * @interface
 */
fireauth.AuthEventProcessor = function() {};


/**
 * Completes the processing of an external Auth event detected by the embedded
 * iframe.
 * @param {?fireauth.AuthEvent} authEvent External Auth event detected by
 *     iframe.
 * @param {!fireauth.AuthEventHandler} owner The owner of the event.
 * @return {!goog.Promise<undefined>}
 */
fireauth.AuthEventProcessor.prototype.processAuthEvent =
    function(authEvent, owner) {};



/**
 * Redirect Auth event manager.
 * @param {!fireauth.AuthEventManager} manager The parent Auth event manager.
 * @constructor
 * @implements {fireauth.AuthEventProcessor}
 */
fireauth.RedirectAuthEventProcessor = function(manager) {
  this.manager_ = manager;
  // Only one redirect result can be tracked on first load.
  /**
   * @private {?function():!goog.Promise<!fireauth.AuthEventManager.Result>}
   *     Redirect result resolver. This will be used to resolve the
   *     getRedirectResult promise. When the redirect result is obtained, this
   *     field will be set.
   */
  this.redirectedUserPromise_ = null;
  /**
   * @private {!Array<function(!fireauth.AuthEventManager.Result)>} Pending
   *     promise redirect resolver. When the redirect result is obtained and the
   *     user is detected, this will be called.
   */
  this.redirectResolve_ = [];
  /**
   * @private {!Array<function(*)>} Pending Promise redirect rejecter. When the
   *     redirect result is obtained and an error is detected, this will be
   *     called.
   */
  this.redirectReject_ = [];
  /** @private {?goog.Promise} Pending timeout promise for redirect. */
  this.redirectTimeoutPromise_ = null;
  /**
   * @private {boolean} Whether redirect result is resolved. This is true
   *     when a valid Auth event has been triggered.
   */
  this.redirectResultResolved_ = false;
  /**
   * @private {boolean} Whether an unrecoverable error was detected. This
   *     includes web storage unsupported or operation not allowed errors.
   */
  this.unrecoverableErrorDetected_ = false;
};


/** Reset any previous redirect result. */
fireauth.RedirectAuthEventProcessor.prototype.reset = function() {
  // Reset to allow override getRedirectResult. This is relevant for Cordova
  // environment where redirect events do not necessarily unload the current
  // page.
  this.redirectedUserPromise_ = null;
  if (this.redirectTimeoutPromise_) {
    this.redirectTimeoutPromise_.cancel();
    this.redirectTimeoutPromise_ = null;
  }
};


/**
 * Completes the processing of an external Auth event detected by the embedded
 * iframe.
 * @param {?fireauth.AuthEvent} authEvent External Auth event detected by
 *     iframe.
 * @param {!fireauth.AuthEventHandler} owner The owner of the event.
 * @return {!goog.Promise<undefined>}
 * @override
 */
fireauth.RedirectAuthEventProcessor.prototype.processAuthEvent =
    function(authEvent, owner) {
  // This should not happen as fireauth.iframe.AuthRelay will not send null
  // events.
  if (!authEvent) {
    return goog.Promise.reject(
        new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT));
  }
  // Reset any pending redirect result. This event will overwrite it.
  this.reset();
  this.redirectResultResolved_ = true;
  var mode = authEvent.getType();
  var eventId = authEvent.getEventId();
  // Check if web storage is not supported in the iframe.
  var isWebStorageNotSupported =
      authEvent.getError() &&
      authEvent.getError()['code'] == 'auth/web-storage-unsupported';
  /// Check if operation is supported in this environment.
  var isOperationNotSupported =
      authEvent.getError() &&
      authEvent.getError()['code'] == 'auth/operation-not-supported-in-this-' +
          'environment';
  this.unrecoverableErrorDetected_ =
      !!(isWebStorageNotSupported || isOperationNotSupported);
  // UNKNOWN mode is always triggered on load by iframe when no popup/redirect
  // data is available. If web storage unsupported error is thrown, process as
  // error and not as unknown event. If the operation is not supported in this
  // environment, also treat as an error and not as an unknown event.
  if (mode == fireauth.AuthEvent.Type.UNKNOWN &&
      !isWebStorageNotSupported &&
      !isOperationNotSupported) {
    return this.processUnknownEvent_();
  } else if (authEvent.hasError()) {
    return this.processErrorEvent_(authEvent, owner);
  } else if (owner.getAuthEventHandlerFinisher(mode, eventId)) {
    return this.processSuccessEvent_(authEvent, owner);
  } else {
    return goog.Promise.reject(
        new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT));
  }
};


/**
 * Sets an empty redirect result response when no redirect result is available.
 */
fireauth.RedirectAuthEventProcessor.prototype.defaultToEmptyResponse =
    function() {
  // If the first event does not resolve redirectResult and no subscriber can
  // handle it, set redirect result to null.
  // An example of this scenario would be a link via redirect that was triggered
  // by a user that was not logged in. canHandleAuthEvent will be false for all
  // subscribers. So make sure getRedirectResult when called will resolve to a
  // null user.
  if (!this.redirectResultResolved_) {
    this.redirectResultResolved_ = true;
    // No Auth event available, getRedirectResult should resolve with null.
    this.setRedirectResult_(false, null, null);
  }
};


/**
 * Clears the cached redirect result as long as there is no pending redirect
 * result being processed. Unrecoverable errors will not be cleared.
 */
fireauth.RedirectAuthEventProcessor.prototype.clearRedirectResult = function() {
  // Clear the result if it is already resolved and no unrecoverable errors are
  // detected.
  if (this.redirectResultResolved_ && !this.unrecoverableErrorDetected_) {
    this.setRedirectResult_(false, null, null);
  }
};


/**
 * Processes the unknown event.
 * @return {!goog.Promise<undefined>}
 * @private
 */
fireauth.RedirectAuthEventProcessor.prototype.processUnknownEvent_ =
    function() {
  // No Auth event available, getRedirectResult should resolve with null.
  this.setRedirectResult_(false, null, null);
  return goog.Promise.resolve();
};


/**
 * Processes an error event.
 * @param {?fireauth.AuthEvent} authEvent External Auth event detected by
 *     iframe.
 * @param {!fireauth.AuthEventHandler} owner The owner of the event.
 * @return {!goog.Promise<undefined>}
 * @private
 */
fireauth.RedirectAuthEventProcessor.prototype.processErrorEvent_ =
    function(authEvent, owner) {
  // Set redirect result to resolve with null if event is not a redirect or
  // reject with error if event is an error.
  this.setRedirectResult_(true, null, authEvent.getError());
  return goog.Promise.resolve();
};


/**
 * Processes a successful event.
 * @param {?fireauth.AuthEvent} authEvent External Auth event detected by
 *     iframe.
 * @param {!fireauth.AuthEventHandler} owner The owner of the event.
 * @return {!goog.Promise<undefined>}
 * @private
 */
fireauth.RedirectAuthEventProcessor.prototype.processSuccessEvent_ =
    function(authEvent, owner) {
  var self = this;
  var eventId = authEvent.getEventId();
  var mode = authEvent.getType();
  var handler = owner.getAuthEventHandlerFinisher(mode, eventId);
  var requestUri = /** @type {string} */ (authEvent.getUrlResponse());
  var sessionId = /** @type {string} */ (authEvent.getSessionId());
  var postBody = /** @type {?string} */ (authEvent.getPostBody());
  var tenantId = /** @type {?string} */ (authEvent.getTenantId());
  var isRedirect = fireauth.AuthEvent.isRedirect(authEvent);
  // Complete sign in or link account operation and then pass result to
  // relevant pending popup promise.
  return handler(requestUri, sessionId, tenantId, postBody)
      .then(function(popupRedirectResponse) {
    // Flow completed.
    // For a redirect operation resolve with the popupRedirectResponse,
    // otherwise resolve with null.
    self.setRedirectResult_(isRedirect, popupRedirectResponse, null);
  }).thenCatch(function(error) {
    // Flow not completed due to error.
    // For a redirect operation reject with the error, otherwise resolve
    // with null.
    self.setRedirectResult_(
        isRedirect, null, /** @type {!fireauth.AuthError} */ (error));
    // Always resolve.
    return;
  });
};


/**
 * Sets redirect error result.
 * @param {!fireauth.AuthError} error The redirect operation error.
 * @private
 */
fireauth.RedirectAuthEventProcessor.prototype.setRedirectReject_ =
    function(error) {
  // If a redirect error detected, reject getRedirectResult with that error.
  this.redirectedUserPromise_ = function() {
    return goog.Promise.reject(error);
  };
  // Reject all pending getRedirectResult promises.
  if (this.redirectReject_.length) {
    for (var i = 0; i < this.redirectReject_.length; i++) {
      this.redirectReject_[i](error);
    }
  }
};


/**
 * Sets redirect success result.
 * @param {!fireauth.AuthEventManager.Result} popupRedirectResult The
 *     resolved user for a successful or null user redirect.
 * @private
 */
fireauth.RedirectAuthEventProcessor.prototype.setRedirectResolve_ =
    function(popupRedirectResult) {
  // If a redirect user detected, resolve getRedirectResult with the
  // popupRedirectResult.
  // Result should not be null in this case.
  this.redirectedUserPromise_ = function() {
    return goog.Promise.resolve(
        /** @type {!fireauth.AuthEventManager.Result} */ (popupRedirectResult));
  };
  // Resolve all pending getRedirectResult promises.
  if (this.redirectResolve_.length) {
    for (var i = 0; i < this.redirectResolve_.length; i++) {
      this.redirectResolve_[i](
          /** @type {!fireauth.AuthEventManager.Result} */ (
              popupRedirectResult));
    }
  }
};


/**
 * @param {boolean} isRedirect Whether Auth event is a redirect event.
 * @param {?fireauth.AuthEventManager.Result} popupRedirectResult The
 *     resolved user for a successful redirect. This user is null if no redirect
 *     operation run.
 * @param {?fireauth.AuthError} error The redirect operation error.
 * @private
 */
fireauth.RedirectAuthEventProcessor.prototype.setRedirectResult_ =
    function(isRedirect, popupRedirectResult, error) {
  if (isRedirect) {
    // This is a redirect operation, either resolves with user or error.
    if (error) {
      // If a redirect error detected, reject getRedirectResult with that error.
      this.setRedirectReject_(error);
    } else {
      // If a redirect user detected, resolve getRedirectResult with the
      // popupRedirectResult.
      // Result should not be null in this case.
      this.setRedirectResolve_(
          /** @type {!fireauth.AuthEventManager.Result} */ (
              popupRedirectResult));
    }
  } else {
    // Not a redirect, set redirectUser_ to return null.
    this.setRedirectResolve_({
      'user': null
    });
  }
  // Reset all pending promises.
  this.redirectResolve_ = [];
  this.redirectReject_ = [];
};


/**
 * Returns the redirect result. If coming back from a successful redirect sign
 * in, will resolve to the signed in user. If coming back from an unsuccessful
 * redirect sign, will reject with the proper error. If no redirect operation
 * called, resolves with null.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.RedirectAuthEventProcessor.prototype.getRedirectResult = function() {
  var self = this;
  // Initial result could be overridden in the case of Cordova.
  // Auth domain must be included for this to resolve.
  // If still pending just return the pending promise.
  var p = new goog.Promise(function(resolve, reject) {
    // The following logic works if this method was called before Auth event
    // is triggered.
    if (!self.redirectedUserPromise_) {
      // Save resolves and rejects of pending promise for redirect operation.
      self.redirectResolve_.push(resolve);
      self.redirectReject_.push(reject);
      // Start timeout listener to getRedirectResult pending promise.
      // Call this only when redirectedUserPromise_ is not determined.
      self.startRedirectTimeout_();
    } else {
      // Called after Auth event is triggered.
      self.redirectedUserPromise_().then(resolve, reject);
    }
  });
  return /** @type {!goog.Promise<!fireauth.AuthEventManager.Result>} */ (p);
};


/**
 * Starts timeout listener for getRedirectResult pending promise. This method
 * should not be called again after getRedirectResult's redirectedUserPromise_
 * is determined.
 * @private
 */
fireauth.RedirectAuthEventProcessor.prototype.startRedirectTimeout_ =
    function() {
  // Expire pending timeout promise for popup operation.
  var self = this;
  var error = new fireauth.AuthError(
      fireauth.authenum.Error.TIMEOUT);
  if (this.redirectTimeoutPromise_) {
    this.redirectTimeoutPromise_.cancel();
  }
  // For redirect mode.
  this.redirectTimeoutPromise_ =
      goog.Timer.promise(fireauth.AuthEventManager.REDIRECT_TIMEOUT_MS_.get())
      .then(function() {
        // If not resolved yet, reject with timeout error.
        if (!self.redirectedUserPromise_) {
          // Consider redirect result resolved.
          self.redirectResultResolved_ = true;
          self.setRedirectResult_(true, null, error);
        }
      });

};



/**
 * Popup Auth event manager.
 * @param {!fireauth.AuthEventManager} manager The parent Auth event manager.
 * @constructor
 * @implements {fireauth.AuthEventProcessor}
 */
fireauth.PopupAuthEventProcessor = function(manager) {
  this.manager_ = manager;
};


/**
 * Completes the processing of an external Auth event detected by the embedded
 * iframe.
 * @param {?fireauth.AuthEvent} authEvent External Auth event detected by
 *     iframe.
 * @param {!fireauth.AuthEventHandler} owner The owner of the event.
 * @return {!goog.Promise<undefined>}
 * @override
 */
fireauth.PopupAuthEventProcessor.prototype.processAuthEvent =
    function(authEvent, owner) {
  // This should not happen as fireauth.iframe.AuthRelay will not send null
  // events.
  if (!authEvent) {
    return goog.Promise.reject(
        new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT));
  }
  var mode = authEvent.getType();
  var eventId = authEvent.getEventId();
  if (authEvent.hasError()) {
    return this.processErrorEvent_(authEvent, owner);
  } else if (owner.getAuthEventHandlerFinisher(mode, eventId)) {
    return this.processSuccessEvent_(authEvent, owner);
  } else {
    return goog.Promise.reject(
        new fireauth.AuthError(fireauth.authenum.Error.INVALID_AUTH_EVENT));
  }
};


/**
 * Processes an error event.
 * @param {?fireauth.AuthEvent} authEvent External Auth event detected by
 *     iframe.
 * @param {!fireauth.AuthEventHandler} owner The owner of the event.
 * @return {!goog.Promise<undefined>}
 * @private
 */
fireauth.PopupAuthEventProcessor.prototype.processErrorEvent_ =
    function(authEvent, owner) {
  var eventId = authEvent.getEventId();
  var mode = authEvent.getType();
  // For pending popup promises trigger rejects with the error.
  owner.resolvePendingPopupEvent(mode, null, authEvent.getError(), eventId);
  return goog.Promise.resolve();
};


/**
 * Processes a successful event.
 * @param {?fireauth.AuthEvent} authEvent External Auth event detected by
 *     iframe.
 * @param {!fireauth.AuthEventHandler} owner The owner of the event.
 * @return {!goog.Promise<undefined>}
 * @private
 */
fireauth.PopupAuthEventProcessor.prototype.processSuccessEvent_ =
    function(authEvent, owner) {
  var eventId = authEvent.getEventId();
  var mode = authEvent.getType();
  var handler = owner.getAuthEventHandlerFinisher(mode, eventId);
  // Successful operation, complete the exchange for an ID token.
  var requestUri = /** @type {string} */ (authEvent.getUrlResponse());
  var sessionId = /** @type {string} */ (authEvent.getSessionId());
  var postBody = /** @type {?string} */ (authEvent.getPostBody());
  var tenantId = /** @type {?string} */ (authEvent.getTenantId());
  // Complete sign in or link account operation and then pass result to
  // relevant pending popup promise.
  return handler(requestUri, sessionId, tenantId, postBody)
      .then(function(popupRedirectResponse) {
    // Flow completed.
    // Resolve pending popup promise if it exists.
    owner.resolvePendingPopupEvent(mode, popupRedirectResponse, null, eventId);
  }).thenCatch(function(error) {
    // Flow not completed due to error.
    // Resolve pending promise if it exists.
    owner.resolvePendingPopupEvent(
        mode, null, /** @type {!fireauth.AuthError} */ (error), eventId);
    // Always resolve.
    return;
  });
};



/**
 * The interface that represents an Auth event handler. It provides the
 * ability for the Auth event manager to determine the owner of an Auth event,
 * the ability to resolve a pending popup event and the appropriate handler for
 * an event.
 * @interface
 */
fireauth.AuthEventHandler = function() {};


/**
 * @param {!fireauth.AuthEvent.Type} mode The Auth type mode.
 * @param {?string=} opt_eventId The event ID.
 * @return {boolean} Whether the Auth event handler can handler the provided
 *     event.
 */
fireauth.AuthEventHandler.prototype.canHandleAuthEvent =
    function(mode, opt_eventId) {};


/**
 * Completes the pending popup operation. If error is not null, rejects with the
 * error. Otherwise, it resolves with the popup redirect result.
 * @param {!fireauth.AuthEvent.Type} mode The Auth type mode.
 * @param {?fireauth.AuthEventManager.Result} popupRedirectResult The result
 *     to resolve with when no error supplied.
 * @param {?fireauth.AuthError} error When supplied, the promise will reject.
 * @param {?string=} opt_eventId The event ID.
 */
fireauth.AuthEventHandler.prototype.resolvePendingPopupEvent =
    function(mode, popupRedirectResult, error, opt_eventId) {};


/**
 * Returns the handler's appropriate popup and redirect sign in operation
 * finisher.
 * @param {!fireauth.AuthEvent.Type} mode The Auth type mode.
 * @param {?string=} opt_eventId The optional event ID.
 * @return {?function(string, string, ?string,
 *     ?string=):!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.AuthEventHandler.prototype.getAuthEventHandlerFinisher =
    function(mode, opt_eventId) {};
