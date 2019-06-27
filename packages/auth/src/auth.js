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
 * @fileoverview The headless Auth class used for authenticating Firebase users.
 */

goog.provide('fireauth.Auth');

goog.require('fireauth.ActionCodeInfo');
goog.require('fireauth.ActionCodeSettings');
goog.require('fireauth.AdditionalUserInfo');
goog.require('fireauth.AuthCredential');
goog.require('fireauth.AuthError');
goog.require('fireauth.AuthEvent');
goog.require('fireauth.AuthEventHandler');
goog.require('fireauth.AuthEventManager');
goog.require('fireauth.AuthProvider');
goog.require('fireauth.AuthSettings');
goog.require('fireauth.AuthUser');
goog.require('fireauth.ConfirmationResult');
goog.require('fireauth.EmailAuthProvider');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.UserEventType');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.constants');
goog.require('fireauth.deprecation');
goog.require('fireauth.idp');
goog.require('fireauth.iframeclient.IfcHandler');
goog.require('fireauth.object');
goog.require('fireauth.storage.RedirectUserManager');
goog.require('fireauth.storage.UserManager');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('goog.object');



/**
 * Creates the Firebase Auth corresponding for the App provided.
 *
 * @param {!firebase.app.App} app The corresponding Firebase App.
 * @constructor
 * @implements {fireauth.AuthEventHandler}
 * @implements {firebase.Service}
 * @extends {goog.events.EventTarget}
 */
fireauth.Auth = function(app) {
  /** @private {boolean} Whether this instance is deleted. */
  this.deleted_ = false;
  /** The Auth instance's settings object. */
  fireauth.object.setReadonlyProperty(
      this, 'settings', new fireauth.AuthSettings());
  /** Auth's corresponding App. */
  fireauth.object.setReadonlyProperty(this, 'app', app);
  // Initialize RPC handler.
  // API key is required for web client RPC calls.
  if (this.app_().options && this.app_().options['apiKey']) {
    var clientFullVersion = firebase.SDK_VERSION ?
        fireauth.util.getClientVersion(
            fireauth.util.ClientImplementation.JSCORE, firebase.SDK_VERSION) :
        null;
    this.rpcHandler_ = new fireauth.RpcHandler(
        this.app_().options && this.app_().options['apiKey'],
        // Get the client Auth endpoint used.
        fireauth.constants.getEndpointConfig(fireauth.constants.clientEndpoint),
        clientFullVersion);
  } else {
    throw new fireauth.AuthError(fireauth.authenum.Error.INVALID_API_KEY);
  }
  /** @private {!Array<!goog.Promise<*, *>|!goog.Promise<void>>} List of
   *      pending promises. */
  this.pendingPromises_ = [];
  /** @private {!Array<!function(?string)>} Auth token listeners. */
  this.authListeners_ = [];
  /** @private {!Array<!function(?string)>} User change listeners. */
  this.userChangeListeners_ = [];
  /**
   * @private {!firebase.Subscribe} The subscribe function to the Auth ID token
   *     change observer. This will trigger on ID token changes, including
   *     token refresh on the same user.
   */
  this.onIdTokenChanged_ = firebase.INTERNAL.createSubscribe(
      goog.bind(this.initIdTokenChangeObserver_, this));
  /**
   * @private {?string|undefined} The UID of the user that last triggered the
   *     user state change listener.
   */
  this.userStateChangeUid_ = undefined;
  /**
   * @private {!firebase.Subscribe} The subscribe function to the user state
   *     change observer.
   */
  this.onUserStateChanged_ = firebase.INTERNAL.createSubscribe(
      goog.bind(this.initUserStateObserver_, this));
  // Set currentUser to null.
  this.setCurrentUser_(null);
  /**
   * @private {!fireauth.storage.UserManager} The Auth user storage
   *     manager instance.
   */
  this.userStorageManager_ =
      new fireauth.storage.UserManager(this.getStorageKey());
  /**
   * @private {!fireauth.storage.RedirectUserManager} The redirect user
   *     storagemanager instance.
   */
  this.redirectUserStorageManager_ =
      new fireauth.storage.RedirectUserManager(this.getStorageKey());
  /**
   * @private {!goog.Promise<undefined>} Promise that resolves when initial
   *     state is loaded from storage.
   */
  this.authStateLoaded_ = this.registerPendingPromise_(this.initAuthState_());
  /**
   * @private {!goog.Promise<undefined>} Promise that resolves when state and
   *     redirect result is ready, after which sign in and sign out operations
   *     are safe to execute.
   */
  this.redirectStateIsReady_ = this.registerPendingPromise_(
      this.initAuthRedirectState_());
  /** @private {boolean} Whether initial state has already been resolved. */
  this.isStateResolved_ = false;
  /**
   * @private {!function()} The syncAuthChanges function with context set to
   *     auth instance.
   */
  this.getSyncAuthUserChanges_ = goog.bind(this.syncAuthUserChanges_, this);
  /** @private {!function(!fireauth.AuthUser):!goog.Promise} The handler for
   *      user state changes. */
  this.userStateChangeListener_ =
      goog.bind(this.handleUserStateChange_, this);
  /** @private {!function(!Object)} The handler for user token changes. */
  this.userTokenChangeListener_ =
      goog.bind(this.handleUserTokenChange_, this);
  /** @private {!function(!Object)} The handler for user deletion. */
  this.userDeleteListener_ = goog.bind(this.handleUserDelete_, this);
  /** @private {!function(!Object)} The handler for user invalidation. */
  this.userInvalidatedListener_ = goog.bind(this.handleUserInvalidated_, this);
  // TODO: find better way to enable or disable auth event manager.
  if (fireauth.AuthEventManager.ENABLED) {
    // Initialize Auth event manager to handle popup and redirect operations.
    this.initAuthEventManager_();
  }

  // Export INTERNAL namespace.
  this.INTERNAL = {};
  this.INTERNAL['delete'] = goog.bind(this.delete, this);
  this.INTERNAL['logFramework'] = goog.bind(this.logFramework, this);
  /**
   * @private {number} The number of Firebase services subscribed to Auth
   *     changes.
   */
  this.firebaseServices_ = 0;
  // Add call to superclass constructor.
  fireauth.Auth.base(this, 'constructor');
  // Initialize readable/writable Auth properties.
  this.initializeReadableWritableProps_();
  /**
   * @private {!Array<string>} List of Firebase frameworks/libraries used. This
   *     is currently only used to log FirebaseUI.
   */
  this.frameworks_ = [];
};
goog.inherits(fireauth.Auth, goog.events.EventTarget);


/**
 * Language code change custom event.
 * @param {?string} languageCode The new language code.
 * @constructor
 * @extends {goog.events.Event}
 */
fireauth.Auth.LanguageCodeChangeEvent = function(languageCode) {
  goog.events.Event.call(
      this, fireauth.constants.AuthEventType.LANGUAGE_CODE_CHANGED);
  this.languageCode = languageCode;
};
goog.inherits(fireauth.Auth.LanguageCodeChangeEvent, goog.events.Event);


/**
 * Framework change custom event.
 * @param {!Array<string>} frameworks The new frameworks array.
 * @constructor
 * @extends {goog.events.Event}
 */
fireauth.Auth.FrameworkChangeEvent = function(frameworks) {
  goog.events.Event.call(
      this, fireauth.constants.AuthEventType.FRAMEWORK_CHANGED);
  this.frameworks = frameworks;
};
goog.inherits(fireauth.Auth.FrameworkChangeEvent, goog.events.Event);


/**
 * Changes the Auth state persistence to the specified one.
 * @param {!fireauth.authStorage.Persistence} persistence The Auth state
 *     persistence mechanism.
 * @return {!goog.Promise<void>}
 */
fireauth.Auth.prototype.setPersistence = function(persistence) {
  // TODO: fix auth.delete() behavior and how this affects persistence
  // change after deletion.
  // Throw an error if already destroyed.
  // Set current persistence.
  var p = this.userStorageManager_.setPersistence(persistence);
  return /** @type {!goog.Promise<void>} */ (this.registerPendingPromise_(p));
};


/**
 * Get rid of Closure warning - the property is adding in the constructor.
 * @type {!firebase.app.App}
 */
fireauth.Auth.prototype.app;


/**
 * Sets the language code.
 * @param {?string} languageCode
 */
fireauth.Auth.prototype.setLanguageCode = function(languageCode) {
  // Don't do anything if no change detected.
  if (this.languageCode_ !== languageCode && !this.deleted_) {
    this.languageCode_ = languageCode;
    // Update custom Firebase locale field.
    this.rpcHandler_.updateCustomLocaleHeader(this.languageCode_);
    // Notify external language code change listeners.
    this.notifyLanguageCodeListeners_();
  }
};


/**
 * Returns the current auth instance's language code if available.
 * @return {?string}
 */
fireauth.Auth.prototype.getLanguageCode = function() {
  return this.languageCode_;
};


/**
 * Sets the current language to the default device/browser preference.
 */
fireauth.Auth.prototype.useDeviceLanguage = function() {
  this.setLanguageCode(fireauth.util.getUserLanguage());
};


/**
 * @param {string} frameworkId The framework identifier.
 */
fireauth.Auth.prototype.logFramework = function(frameworkId) {
  // Theoretically multiple frameworks could be used
  // (angularfire and FirebaseUI). Once a framework is used, it is not going
  // to be unused, so no point adding a method to remove the framework ID.
  this.frameworks_.push(frameworkId);
  // Update the client version in RPC handler with the new frameworks.
  this.rpcHandler_.updateClientVersion(firebase.SDK_VERSION ?
        fireauth.util.getClientVersion(
            fireauth.util.ClientImplementation.JSCORE, firebase.SDK_VERSION,
            this.frameworks_) :
        null);
  this.dispatchEvent(new fireauth.Auth.FrameworkChangeEvent(
      this.frameworks_));
};


/** @return {!Array<string>} The current Firebase frameworks. */
fireauth.Auth.prototype.getFramework = function() {
  return goog.array.clone(this.frameworks_);
};


/**
 * Updates the framework list on the provided user and configures the user to
 * listen to the Auth instance for any framework ID changes.
 * @param {!fireauth.AuthUser} user The user to whose framework list needs to be
 *     updated.
 * @private
 */
fireauth.Auth.prototype.setUserFramework_ = function(user) {
  // Sets the framework ID on the user.
  user.setFramework(this.frameworks_);
  // Sets current Auth instance as framework list change dispatcher on the user.
  user.setFrameworkChangeDispatcher(this);
};


/**
 * Initializes readable/writable properties on Auth.
 * @suppress {invalidCasts}
 * @private
 */
fireauth.Auth.prototype.initializeReadableWritableProps_ = function() {
  Object.defineProperty(/** @type {!Object} */ (this), 'lc', {
    /**
     * @this {!Object}
     * @return {?string} The current language code.
     */
    get: function() {
      return this.getLanguageCode();
    },
    /**
     * @this {!Object}
     * @param {string} value The new language code.
     */
    set: function(value) {
      this.setLanguageCode(value);
    },
    enumerable: false
  });
  // Initialize to null.
  /** @private {?string} The current Auth instance's language code. */
  this.languageCode_ = null;
};


/**
 * Notifies all external listeners of the language code change.
 * @private
 */
fireauth.Auth.prototype.notifyLanguageCodeListeners_ = function() {
  // Notify external listeners on the language code change.
  this.dispatchEvent(new fireauth.Auth.LanguageCodeChangeEvent(
      this.getLanguageCode()));
};





/**
 * @return {!Object} The object representation of the Auth instance.
 * @override
 */
fireauth.Auth.prototype.toJSON = function() {
  // Return the plain object representation in case JSON.stringify is called on
  // an Auth instance.
  return {
    'apiKey': this.app_().options['apiKey'],
    'authDomain': this.app_().options['authDomain'],
    'appName': this.app_().name,
    'currentUser': this.currentUser_() && this.currentUser_().toPlainObject()
  };
};


/**
 * Returns the Auth event manager promise.
 * @return {!goog.Promise<!fireauth.AuthEventManager>}
 * @private
 */
fireauth.Auth.prototype.getAuthEventManager_ = function() {
  // Either return cached Auth event manager promise provider if available or a
  // promise that rejects with missing Auth domain error.
  return this.eventManagerProviderPromise_ ||
      goog.Promise.reject(
          new fireauth.AuthError(fireauth.authenum.Error.MISSING_AUTH_DOMAIN));
};


/**
 * Initializes the Auth event manager when state is ready.
 * @private
 */
fireauth.Auth.prototype.initAuthEventManager_ = function() {
  // Initialize Auth event manager on initState.
  var self = this;
  var authDomain = this.app_().options['authDomain'];
  var apiKey = this.app_().options['apiKey'];
  // Make sure environment also supports popup and redirect.
  if (authDomain && fireauth.util.isPopupRedirectSupported()) {
    // Auth domain is required for Auth event manager to resolve.
    // Auth state has to be loaded first. One reason is to process link events.
    this.eventManagerProviderPromise_ = this.authStateLoaded_.then(function() {
      if (self.deleted_) {
        return;
      }
      // By this time currentUser should be ready if available and will be able
      // to resolve linkWithRedirect if detected.
      self.authEventManager_ = fireauth.AuthEventManager.getManager(
          authDomain, apiKey, self.app_().name);
      // Subscribe Auth instance.
      self.authEventManager_.subscribe(self);
      // Subscribe current user by enabling popup and redirect on that user.
      if (self.currentUser_()) {
        self.currentUser_().enablePopupRedirect();
      }
      // If a redirect user is present, subscribe to popup and redirect events.
      // In case current user was not available and the developer called link
      // with redirect on a signed out user, this will work and the linked
      // logged out user will be returned in getRedirectResult.
      // current user and redirect user are the same (was already logged in),
      // currentUser will have priority as it is subscribed before redirect
      // user. This change will also allow further popup and redirect events on
      // the redirect user going forward.
      if (self.redirectUser_) {
        self.redirectUser_.enablePopupRedirect();
        // Set the user language for the redirect user.
        self.setUserLanguage_(
            /** @type {!fireauth.AuthUser} */ (self.redirectUser_));
        // Set the user Firebase frameworks for the redirect user.
        self.setUserFramework_(
            /** @type {!fireauth.AuthUser} */ (self.redirectUser_));
        // Reference to redirect user no longer needed.
        self.redirectUser_ = null;
      }
      return self.authEventManager_;
    });
  }
};


/**
 * @param {!fireauth.AuthEvent.Type} mode The Auth type mode.
 * @param {?string=} opt_eventId The event ID.
 * @return {boolean} Whether the auth event handler can handler the provided
 *     event.
 * @override
 */
fireauth.Auth.prototype.canHandleAuthEvent = function(mode, opt_eventId) {
  // Only sign in events are handled.
  switch (mode) {
    // Accept all general sign in with redirect and unknowns.
    // Migrating redirect events to use session storage will prevent this event
    // from leaking to other tabs.
    case fireauth.AuthEvent.Type.UNKNOWN:
    case fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT:
      return true;
    case fireauth.AuthEvent.Type. SIGN_IN_VIA_POPUP:
      // Pending sign in with popup event must match the stored popup event ID.
      return this.popupEventId_ == opt_eventId &&
          !!this.pendingPopupResolvePromise_;
    default:
      return false;
  }
};


/**
 * Completes the pending popup operation. If error is not null, rejects with the
 * error. Otherwise, it resolves with the popup redirect result.
 * @param {!fireauth.AuthEvent.Type} mode The Auth type mode.
 * @param {?fireauth.AuthEventManager.Result} popupRedirectResult The result
 *     to resolve with when no error supplied.
 * @param {?fireauth.AuthError} error When supplied, the promise will reject.
 * @param {?string=} opt_eventId The event ID.
 * @override
 */
fireauth.Auth.prototype.resolvePendingPopupEvent =
    function(mode, popupRedirectResult, error, opt_eventId) {
  // Only handles popup events of type sign in and which match popup event ID.
  if (mode != fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP ||
      this.popupEventId_ != opt_eventId) {
    return;
  }
  if (error && this.pendingPopupRejectPromise_) {
    // Reject with error for supplied mode.
    this.pendingPopupRejectPromise_(error);
  } else if (popupRedirectResult &&
             !error &&
             this.pendingPopupResolvePromise_) {
    // Resolve with result for supplied mode.
    this.pendingPopupResolvePromise_(popupRedirectResult);
  }
  // Now that event is resolved, delete popup timeout promise.
  if (this.popupTimeoutPromise_) {
    this.popupTimeoutPromise_.cancel();
    this.popupTimeoutPromise_ = null;
  }
  // Delete pending promises.
  delete this.pendingPopupResolvePromise_;
  delete this.pendingPopupRejectPromise_;
};


/**
 * Returns the handler's appropriate popup and redirect sign in operation
 * finisher.
 * @param {!fireauth.AuthEvent.Type} mode The Auth type mode.
 * @param {?string=} opt_eventId The optional event ID.
 * @return {?function(string,
 *     string, ?string=):!goog.Promise<!fireauth.AuthEventManager.Result>}
 * @override
 */
fireauth.Auth.prototype.getAuthEventHandlerFinisher =
    function(mode, opt_eventId) {
  // Sign in events will be completed by finishPopupAndRedirectSignIn.
  if (mode == fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT) {
    return goog.bind(this.finishPopupAndRedirectSignIn, this);
  } else if (mode == fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP &&
             this.popupEventId_ == opt_eventId &&
             this.pendingPopupResolvePromise_) {
    return goog.bind(this.finishPopupAndRedirectSignIn, this);
  }
  return null;
};


/**
 * Finishes the popup and redirect sign in operations.
 * @param {string} requestUri The callback url with the oauth response.
 * @param {string} sessionId The session id used to generate the authUri.
 * @param {?string=} opt_postBody The optional POST body content.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.Auth.prototype.finishPopupAndRedirectSignIn =
    function(requestUri, sessionId, opt_postBody) {
  var self = this;
  // Verify assertion request.
  var request = {
    'requestUri': requestUri,
    'postBody': opt_postBody,
    'sessionId': sessionId
  };
  // Now that popup has responded, delete popup timeout promise.
  if (this.popupTimeoutPromise_) {
    this.popupTimeoutPromise_.cancel();
    this.popupTimeoutPromise_ = null;
  }
  // This routine could be run before init state, make sure it waits for that to
  // complete.
  var credential = null;
  var additionalUserInfo = null;
  var idTokenResolver = self.rpcHandler_.verifyAssertion(request)
      .then(function(response) {
        // Get Auth credential from verify assert request and save it.
        credential = fireauth.AuthProvider.getCredentialFromResponse(response);
        // Get additional IdP data if available in the response.
        additionalUserInfo = fireauth.AdditionalUserInfo.fromPlainObject(
            response);
        return response;
      });
  // When state is ready, run verify assertion request.
  // This will only run either after initial and redirect state is ready for
  // popups or after initial state is ready for redirect resolution.
  var p = self.authStateLoaded_.then(function() {
    return idTokenResolver;
  }).then(function(idTokenResponse) {
    // Use ID token response to sign in the Auth user.
    return self.signInWithIdTokenResponse(idTokenResponse);
  }).then(function() {
    // On sign in success, construct redirect and popup result and return a
    // readonly copy of it.
    return fireauth.object.makeReadonlyCopy({
      'user': self.currentUser_(),
      'credential': credential,
      'additionalUserInfo': additionalUserInfo,
      // Sign in operation type.
      'operationType': fireauth.constants.OperationType.SIGN_IN
    });
  });
  return /** @type {!goog.Promise<!fireauth.AuthEventManager.Result>} */ (
      this.registerPendingPromise_(p));
};


/**
 * @return {string} The generated event ID used to identify a popup event.
 * @private
 */
fireauth.Auth.prototype.generateEventId_ = function() {
  return fireauth.util.generateEventId();
};


/**
 * Signs in to Auth provider via popup.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.Auth.prototype.signInWithPopup = function(provider) {
  // Check if popup and redirect are supported in this environment.
  if (!fireauth.util.isPopupRedirectSupported()) {
    return goog.Promise.reject(new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED));
  }
  var mode = fireauth.AuthEvent.Type.SIGN_IN_VIA_POPUP;
  var self = this;
  // Popup the window immediately to make sure the browser associates the
  // popup with the click that triggered it.

  // Get provider settings.
  var settings = fireauth.idp.getIdpSettings(provider['providerId']);
  // There could multiple sign in with popup events in different windows.
  // We need to match the correct popup to the correct pending promise.
  var eventId = this.generateEventId_();
  // If incapable of redirecting popup from opener, popup destination URL
  // directly. This could also happen in a sandboxed iframe.
  var oauthHelperWidgetUrl = null;
  if ((!fireauth.util.runsInBackground() || fireauth.util.isIframe()) &&
      this.app_().options['authDomain'] &&
      provider['isOAuthProvider']) {
    oauthHelperWidgetUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            this.app_().options['authDomain'],
            this.app_().options['apiKey'],
            this.app_().name,
            mode,
            provider,
            null,
            eventId,
            firebase.SDK_VERSION || null);
  }
  // The popup must have a name, otherwise when successive popups are triggered
  // they will all render in the same instance and none will succeed since the
  // popup cancel of first window will close the shared popup window instance.
  var popupWin =
      fireauth.util.popup(
          oauthHelperWidgetUrl,
          fireauth.util.generateRandomString(),
          settings && settings.popupWidth,
          settings && settings.popupHeight);
  // Auth event manager must be available for popup sign in to be possible.
  var p = this.getAuthEventManager_().then(function(manager) {
    // Process popup request tagging it with newly created event ID.
    return manager.processPopup(
        popupWin, mode, provider, eventId, !!oauthHelperWidgetUrl);
  }).then(function() {
    return new goog.Promise(function(resolve, reject) {
      // Expire other pending promises if still available..
      self.resolvePendingPopupEvent(
          mode,
          null,
          new fireauth.AuthError(fireauth.authenum.Error.EXPIRED_POPUP_REQUEST),
          // Existing pending popup event ID.
          self.popupEventId_);
      // Save current pending promises.
      self.pendingPopupResolvePromise_ = resolve;
      self.pendingPopupRejectPromise_ = reject;
      // Overwrite popup event ID with new one corresponding to popup.
      self.popupEventId_ = eventId;
      // Keep track of timeout promise to cancel it on promise resolution before
      // it times out.
      self.popupTimeoutPromise_ =
          self.authEventManager_.startPopupTimeout(
              self, mode, /** @type {!Window} */ (popupWin), eventId);
    });
  }).then(function(result) {
    // On resolution, close popup if still opened and pass result through.
    if (popupWin) {
      fireauth.util.closeWindow(popupWin);
    }
    if (result) {
      return fireauth.object.makeReadonlyCopy(result);
    }
    return null;
  }).thenCatch(function(error) {
    if (popupWin) {
      fireauth.util.closeWindow(popupWin);
    }
    throw error;
  });
  return /** @type {!goog.Promise<!fireauth.AuthEventManager.Result>} */ (
      this.registerPendingPromise_(p));
};


/**
 * Signs in to Auth provider via redirect.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @return {!goog.Promise<void>}
 */
fireauth.Auth.prototype.signInWithRedirect = function(provider) {
  // Check if popup and redirect are supported in this environment.
  if (!fireauth.util.isPopupRedirectSupported()) {
    return goog.Promise.reject(new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED));
  }
  var self = this;
  var mode = fireauth.AuthEvent.Type.SIGN_IN_VIA_REDIRECT;
  // Auth event manager must be available for sign in via redirect to be
  // possible.
  var p = this.getAuthEventManager_().then(function(manager) {
    // Remember current persistence to apply it on the next page.
    // This is the only time the state is passed to the next page (when user is
    // not already logged in).
    // This is not needed for link and reauthenticate as the user is already
    // stored with specified persistence.
    return self.userStorageManager_.savePersistenceForRedirect();
  }).then(function() {
    // Process redirect operation.
    return self.authEventManager_.processRedirect(mode, provider);
  });
  return /** @type {!goog.Promise<void>} */ (this.registerPendingPromise_(p));
};


/**
 * Returns the redirect result. If coming back from a successful redirect sign
 * in, will resolve to the signed in user. If coming back from an unsuccessful
 * redirect sign, will reject with the proper error. If no redirect operation
 * called, resolves with null.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.Auth.prototype.getRedirectResult = function() {
  // Check if popup and redirect are supported in this environment.
  if (!fireauth.util.isPopupRedirectSupported()) {
    return goog.Promise.reject(new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED));
  }
  var self = this;
  // Auth event manager must be available for get redirect result to be
  // possible.
  var p = this.getAuthEventManager_().then(function(manager) {
    // Return redirect result when resolved.
    return self.authEventManager_.getRedirectResult();
  }).then(function(result) {
    if (result) {
      return fireauth.object.makeReadonlyCopy(result);
    }
    return null;
  });
  return /** @type {!goog.Promise<!fireauth.AuthEventManager.Result>} */ (
      this.registerPendingPromise_(p));
};


/**
 * Asynchronously sets the provided user as currentUser on the current Auth
 * instance.
 * @param {?fireauth.AuthUser} user The user to be copied to Auth instance.
 * @return {!goog.Promise<void>}
 */
fireauth.Auth.prototype.updateCurrentUser = function(user) {
  if (!user) {
    return goog.Promise.reject(new fireauth.AuthError(
        fireauth.authenum.Error.NULL_USER));
  }
  var self = this;
  var options = {};
  options['apiKey'] = this.app_().options['apiKey'];
  options['authDomain'] = this.app_().options['authDomain'];
  options['appName'] = this.app_().name;
  var newUser = fireauth.AuthUser.copyUser(user, options,
      self.redirectUserStorageManager_, self.getFramework());
  return this.registerPendingPromise_(
      this.redirectStateIsReady_.then(function() {
        if (self.app_().options['apiKey'] != user.getApiKey()) {
          // Throws auth/invalid-user-token if user doesn't belong to app.
          // Throws auth/user-token-expired if token expires.
          return newUser.reload();
        }
      }).then(function() {
        if (self.currentUser_() && user['uid'] == self.currentUser_()['uid']) {
          // Same user signed in. Update user data and notify Auth listeners.
          // No need to resubscribe to user events.
          // TODO: Check if the user to copy is older than current user and skip
          // the copy logic in that case.
          self.currentUser_().copy(user);
          return self.handleUserStateChange_(user);
        }
        self.setCurrentUser_(newUser);
        // Enable popup and redirect events.
        newUser.enablePopupRedirect();
        // Save user changes.
        return self.handleUserStateChange_(newUser);
      }).then(function(user) {
        self.notifyAuthListeners_();
      }));
};


/**
 * Completes the headless sign in with the server response containing the STS
 * access and refresh tokens, and sets the Auth user as current user while
 * setting all listeners to it and saving it to storage.
 * @param {!Object<string, string>} idTokenResponse The ID token response from
 *     the server.
 * @return {!goog.Promise<void>}
 */
fireauth.Auth.prototype.signInWithIdTokenResponse =
    function(idTokenResponse) {
  var self = this;
  var options = {};
  options['apiKey'] = self.app_().options['apiKey'];
  options['authDomain'] = self.app_().options['authDomain'];
  options['appName'] = self.app_().name;
  // Wait for state to be ready.
  // This is used internally and is also used for redirect sign in so there is
  // no need for waiting for redirect result to resolve since redirect result
  // depends on it.
  return this.authStateLoaded_.then(function() {
    // Initialize an Auth user using the provided ID token response.
    return fireauth.AuthUser.initializeFromIdTokenResponse(
        options,
        idTokenResponse,
        /** @type {!fireauth.storage.RedirectUserManager} */ (
            self.redirectUserStorageManager_),
        // Pass frameworks so they are logged in getAccountInfo while populating
        // the user info.
        self.getFramework());
  }).then(function(user) {
    // Check if the same user is already signed in.
    if (self.currentUser_() &&
        user['uid'] == self.currentUser_()['uid']) {
      // Same user signed in. Update user data and notify Auth listeners.
      // No need to resubscribe to user events.
      self.currentUser_().copy(user);
      return self.handleUserStateChange_(user);
    }
    // New user.
    // Set current user and attach all listeners to it.
    self.setCurrentUser_(user);
    // Enable popup and redirect events.
    user.enablePopupRedirect();
    // Save user changes.
    return self.handleUserStateChange_(user);
  }).then(function() {
    // Notify external Auth listeners only when state is ready.
    self.notifyAuthListeners_();
  });
};


/**
 * Updates the current auth user and attaches event listeners to changes on it.
 * Also removes all event listeners from previously signed in user.
 * @param {?fireauth.AuthUser} user The current user instance.
 * @private
 */
fireauth.Auth.prototype.setCurrentUser_ = function(user) {
  // Must be called first before updating currentUser reference.
  this.attachEventListeners_(user);
  // Update currentUser property.
  fireauth.object.setReadonlyProperty(this, 'currentUser', user);
  if (user) {
    // If a user is available, set the language code on it and set current Auth
    // instance as language code change dispatcher.
    this.setUserLanguage_(user);
    // Set the current frameworks used on the user and set current Auth instance
    // as the framework change dispatcher.
    this.setUserFramework_(user);
  }
};


/**
 * Signs out the current user while deleting the Auth user from storage and
 * removing all listeners from it.
 * @return {!goog.Promise<void>}
 */
fireauth.Auth.prototype.signOut = function() {
  var self = this;
  // Wait for final state to be ready first, otherwise a signed out user could
  // come back to life.
  var p = this.redirectStateIsReady_.then(function() {
    // Ignore if already signed out.
    if (!self.currentUser_()) {
      return goog.Promise.resolve();
    }
    // Detach all event listeners.
    // Set current user to null.
    self.setCurrentUser_(null);
    // Remove current user from storage
    return /** @type {!fireauth.storage.UserManager} */ (
        self.userStorageManager_).removeCurrentUser()
        .then(function() {
          // Notify external Auth listeners of this Auth change event.
          self.notifyAuthListeners_();
        });
  });
  return /** @type {!goog.Promise<void>} */ (this.registerPendingPromise_(p));
};


/**
 * @return {!goog.Promise} A promise that resolved when any stored redirect user
 *     is loaded and removed from session storage and then stored locally.
 * @private
 */
fireauth.Auth.prototype.initRedirectUser_ = function() {
  var self = this;
  var authDomain = this.app_().options['authDomain'];
  // Get any saved redirect user and delete from session storage.
  // Override user's authDomain with app's authDomain if there is a mismatch.
  var p = /** @type {!fireauth.storage.RedirectUserManager} */ (
      this.redirectUserStorageManager_).getRedirectUser(authDomain)
          .then(function(user) {
            // Save redirect user.
            self.redirectUser_ = user;
            if (user) {
              // Set redirect storage manager on user.
              user.setRedirectStorageManager(
                  /** @type {!fireauth.storage.RedirectUserManager} */ (
                      self.redirectUserStorageManager_));
            }
            // Delete redirect user.
            return /** @type {!fireauth.storage.RedirectUserManager} */ (
                self.redirectUserStorageManager_).removeRedirectUser();
          });
  return /** @type {!goog.Promise<undefined>} */ (
      this.registerPendingPromise_(p));
};


/**
 * Loads the initial Auth state for current application from web storage and
 * initializes Auth user accordingly to reflect that state. This routine does
 * not wait for any pending redirect result to be resolved.
 * @return {!goog.Promise<undefined>} Promise that resolves when state is ready,
 *     loaded from storage.
 * @private
 */
fireauth.Auth.prototype.initAuthState_ = function() {
  // Load current user from storage.
  var self = this;
  var authDomain = this.app_().options['authDomain'];
  // Get any saved redirected user first.
  var p = this.initRedirectUser_().then(function() {
    // Override user's authDomain with app's authDomain if there is a mismatch.
    return /** @type {!fireauth.storage.UserManager} */ (
        self.userStorageManager_).getCurrentUser(authDomain);
  }).then(function(user) {
    // Logged in user.
    if (user) {
      // Set redirect storage manager on user.
      user.setRedirectStorageManager(
          /** @type {!fireauth.storage.RedirectUserManager} */ (
              self.redirectUserStorageManager_));
      // If the current user is undergoing a redirect operation, do not reload
      // as that could could potentially delete the user if the token is
      // expired. Instead any token problems will be detected via the
      // verifyAssertion flow or the remaining flow. This is critical for
      // reauthenticateWithRedirect as this flow is potentially used to recover
      // from a token expiration error.
      if (self.redirectUser_ &&
          self.redirectUser_.getRedirectEventId() ==
          user.getRedirectEventId()) {
        return user;
      }
      // Confirm user valid first before setting listeners.
      return user.reload().then(function() {
        // Force user saving after reload as state change listeners not
        // subscribed yet below via setCurrentUser_. Changes may have happened
        // externally such as email actions or changes on another device.
        return self.userStorageManager_.setCurrentUser(user).then(function() {
          return user;
        });
      }).thenCatch(function(error) {
        if (error['code'] == 'auth/network-request-failed') {
          // Do not delete the user from storage if connection is lost or app is
          // offline.
          return user;
        }
        // Invalid user, could be deleted, remove from storage and resolve with
        // null.
        return /** @type {!fireauth.storage.UserManager} */(
            self.userStorageManager_).removeCurrentUser();
      });
    }
    // No logged in user, resolve with null;
    return null;
  }).then(function(user) {
    // Even though state not ready yet pending any redirect result.
    // Current user needs to be available for link with redirect to complete.
    // This will also set listener on the user changes in case state changes
    // occur they would get updated in storage too.
    self.setCurrentUser_(user || null);
  });
  // In case the app is deleted before it is initialized with state from
  // storage.
  return /** @type {!goog.Promise<undefined>} */ (
      this.registerPendingPromise_(p));
};


/**
 * After initial Auth state is loaded, waits for any pending redirect result,
 * resolves it and then adds the external Auth state change listeners and
 * triggers first state of all observers.
 * @return {!goog.Promise<undefined>} Promise that resolves when state is ready
 *     taking into account any pending redirect result.
 * @private
 */
fireauth.Auth.prototype.initAuthRedirectState_ = function() {
  var self = this;
  // Wait first for state to be loaded from storage.
  return this.authStateLoaded_.then(function() {
    // Resolve any pending redirect result.
    return self.getRedirectResult();
  }).thenCatch(function(error) {
    // Ignore any error in the process. Redirect could be not supported.
    return;
  }).then(function() {
    // Make sure instance was not deleted before proceeding.
    if (self.deleted_) {
      return;
    }
    // Between init Auth state and get redirect result resolution there
    // could have been a sign in attempt in another window.
    // Force sync and then add listener to run sync on change below.
    return self.getSyncAuthUserChanges_();
  }).thenCatch(function(error) {
    // Ignore any error in the process.
    return;
  }).then(function() {
    // Now that final state is ready, make sure instance was not deleted before
    // proceeding.
    if (self.deleted_) {
      return;
    }
    // Initial state has been resolved.
    self.isStateResolved_ = true;
    // Add user state change listener so changes are synchronized with
    // other windows and tabs.
    /** @type {!fireauth.storage.UserManager} */ (self.userStorageManager_
        ).addCurrentUserChangeListener(self.getSyncAuthUserChanges_);
  });
};


/**
 * Synchronizes current Auth to stored auth state, used when external state
 * changes occur.
 * @return {!goog.Promise<void>}
 * @private
 */
fireauth.Auth.prototype.syncAuthUserChanges_ = function() {
  // Get Auth user state from storage and compare to current state.
  // Safe to run when no external change is detected.
  var self = this;
  var authDomain = this.app_().options['authDomain'];
  // Override user's authDomain with app's authDomain if there is a mismatch.
  return /** @type {!fireauth.storage.UserManager} */ (
      this.userStorageManager_).getCurrentUser(authDomain)
      .then(function(user) {
        // In case this was deleted.
        if (self.deleted_) {
          return;
        }
        // Since the authDomain could be modified here, saving to storage here
        // could trigger an infinite loop of changes between this tab and
        // another tab using different Auth domain but since sync Auth user
        // changes does not save changes to storage, except for getToken below
        // if the token needs refreshing but will stop triggering the first time
        // the token is refreshed on one of the first tab that refreshes it.
        // The latter should not happen anyway since getToken should be valid
        // at all times since anything that triggers the storage change should
        // have communicated with the backend and that requires a valid token.
        // In addition, authDomain difference is an edge case to begin with.

        // If the same user is to be synchronized.
        if (self.currentUser_() &&
            user &&
            self.currentUser_().hasSameUserIdAs(user)) {
          // Data update, simply copy data changes.
          self.currentUser_().copy(user);
          // If tokens changed from previous user tokens, this will trigger
          // notifyAuthListeners_.
          return self.currentUser_().getIdToken();
        } else if (!self.currentUser_() && !user) {
          // No change, do nothing (was signed out and remained signed out).
          return;
        } else {
          // Update current Auth state. Either a new login or logout.
          self.setCurrentUser_(user);
          // If a new user is signed in, enabled popup and redirect on that
          // user.
          if (user) {
            user.enablePopupRedirect();
            // Set redirect storage manager on user.
            user.setRedirectStorageManager(
                /** @type {!fireauth.storage.RedirectUserManager} */ (
                    self.redirectUserStorageManager_));
          }
          if (self.authEventManager_) {
            self.authEventManager_.subscribe(self);
          }
          // Notify external Auth changes of Auth change event.
          self.notifyAuthListeners_();
        }
      });
};


/**
 * Updates the language code on the provided user and configures the user to
 * listen to the Auth instance for any language code changes.
 * @param {!fireauth.AuthUser} user The user to whose language needs to be set.
 * @private
 */
fireauth.Auth.prototype.setUserLanguage_ = function(user) {
  // Sets the current language code on the user.
  user.setLanguageCode(this.getLanguageCode());
  // Sets current Auth instance as language code change dispatcher on the user.
  user.setLanguageCodeChangeDispatcher(this);
};


/**
 * Handles user state changes.
 * @param {!fireauth.AuthUser} user The user which triggered the state changes.
 * @return {!goog.Promise} The promise that resolves when state changes are
 *     handled.
 * @private
 */
fireauth.Auth.prototype.handleUserStateChange_ = function(user) {
  // Save Auth user state changes.
  return /** @type {!fireauth.storage.UserManager} */ (
      this.userStorageManager_).setCurrentUser(user);
};


/**
 * Handles user token changes.
 * @param {!Object} event The token change event.
 * @private
 */
fireauth.Auth.prototype.handleUserTokenChange_ = function(event) {
  // This is only called when user is ready and Auth state has been resolved.
  // Notify external Auth change listeners.
  this.notifyAuthListeners_();
  // Save user token changes.
  this.handleUserStateChange_(/** @type {!fireauth.AuthUser} */ (
      this.currentUser_()));
};


/**
 * Handles user deletion events.
 * @param {!Object} event The user delete event.
 * @private
 */
fireauth.Auth.prototype.handleUserDelete_ = function(event) {
  // A deleted user will be treated like a sign out event.
  this.signOut();
};


/**
 * Handles user invalidation events.
 * @param {!Object} event The user invalidation event.
 * @private
 */
fireauth.Auth.prototype.handleUserInvalidated_ = function(event) {
  // An invalidated user will be treated like a sign out event.
  this.signOut();
};


/**
 * Detaches all previous listeners on current user and reattach new listeners to
 * provided user if not null.
 * @param {?fireauth.AuthUser} user The user to attach event listeners to.
 * @private
 */
fireauth.Auth.prototype.attachEventListeners_ = function(user) {
  // Remove existing event listeners from previous current user if available.
  if (this.currentUser_()) {
    this.currentUser_().removeStateChangeListener(
        this.userStateChangeListener_);
    goog.events.unlisten(
        this.currentUser_(),
        fireauth.UserEventType.TOKEN_CHANGED,
        this.userTokenChangeListener_);
    goog.events.unlisten(
        this.currentUser_(),
        fireauth.UserEventType.USER_DELETED,
        this.userDeleteListener_);
    goog.events.unlisten(
        this.currentUser_(),
        fireauth.UserEventType.USER_INVALIDATED,
        this.userInvalidatedListener_);
    // Stop proactive token refresh on the current user.
    this.currentUser_().stopProactiveRefresh();
  }
  // If a new user is provided, attach event listeners to state, token, user
  // invalidation and delete events.
  if (user) {
    user.addStateChangeListener(this.userStateChangeListener_);
    goog.events.listen(
        user,
        fireauth.UserEventType.TOKEN_CHANGED,
        this.userTokenChangeListener_);
    goog.events.listen(
        user,
        fireauth.UserEventType.USER_DELETED,
        this.userDeleteListener_);
     goog.events.listen(
        user,
        fireauth.UserEventType.USER_INVALIDATED,
        this.userInvalidatedListener_);
    // Start proactive token refresh on new user if there is at least one
    // Firebase service subscribed to Auth changes.
    if (this.firebaseServices_ > 0) {
      user.startProactiveRefresh();
    }
  }
};


/**
 * Signs in with ID token promise provider.
 * @param {!goog.Promise<!Object>} idTokenPromise
 *     The rpc handler method that returns a promise which resolves with an ID
 *     token.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 * @private
 */
fireauth.Auth.prototype.signInWithIdTokenProvider_ = function(idTokenPromise) {
  var self = this;
  var credential = null;
  var additionalUserInfo = null;
  return /** @type {!goog.Promise<!fireauth.AuthEventManager.Result>} */ (
      this.registerPendingPromise_(
          idTokenPromise
          .then(function(idTokenResponse) {
            // Get credential if available in the response.
            credential = fireauth.AuthProvider.getCredentialFromResponse(
                idTokenResponse);
            // Get additional IdP data if available in the response.
            additionalUserInfo = fireauth.AdditionalUserInfo.fromPlainObject(
                idTokenResponse);
            // When custom token is exchanged for idToken, continue sign in with
            // ID token and return firebase Auth user.
            return self.signInWithIdTokenResponse(idTokenResponse);
          })
          .then(function() {
            // Resolve promise with a readonly user credential object.
            return fireauth.object.makeReadonlyCopy({
              // Return the current user reference.
              'user': self.currentUser_(),
              // Return any credential passed from the backend.
              'credential': credential,
              // Return any additional IdP data passed from the backend.
              'additionalUserInfo': additionalUserInfo,
              // Sign in operation type.
              'operationType': fireauth.constants.OperationType.SIGN_IN
            });
          })));
};


/**
 * Initializes the Auth state change observer returned by the
 * firebase.INTERNAL.createSubscribe helper.
 * @param {!firebase.Observer} observer The Auth state change observer.
 * @private
 */
fireauth.Auth.prototype.initIdTokenChangeObserver_ = function(observer) {
  var self = this;
  // Adds a listener that will transmit the event everytime it's called.
  this.addAuthTokenListener(function(accessToken) {
    observer.next(self.currentUser_());
  });
};


/**
 * Initializes the user state change observer returned by the
 * firebase.INTERNAL.createSubscribe helper.
 * @param {!firebase.Observer} observer The user state change observer.
 * @private
 */
fireauth.Auth.prototype.initUserStateObserver_ = function(observer) {
  var self = this;
  // Adds a listener that will transmit the event everytime it's called.
  this.addUserChangeListener_(function(accessToken) {
    observer.next(self.currentUser_());
  });
};


/**
 * Adds an observer for Auth state changes, we need to wrap the call as
 * the args checking code needs a method defined on the prototype this way,
 * not within the constructor, and we also have to implement the behavior
 * that will trigger an observer right away if state is ready.
 * @param {!firebase.Observer|function(?fireauth.AuthUser)}
 *     nextOrObserver An observer object or a function triggered on change.
 * @param {function(!fireauth.AuthError)=} opt_error Optional A function
 *     triggered on Auth error.
 * @param {function()=} opt_completed Optional A function triggered when the
 *     observer is removed.
 * @return {!function()} The unsubscribe function for the observer.
 */
fireauth.Auth.prototype.onIdTokenChanged = function(
    nextOrObserver, opt_error, opt_completed) {
  var self = this;
  // State already determined. Trigger immediately, otherwise initState will
  // take care of notifying all pending listeners on initialization.
  // In this case we do not trigger synchronously and trigger via a resolved
  // promise as required by specs.
  if (this.isStateResolved_) {
    // The observer cannot be called synchronously. We're using the
    // native Promise implementation as otherwise it creates weird behavior
    // where the order of promises resolution would not be as expected.
    // It is due to the fact fireauth and firebase.app use their own
    // and different promises library and this leads to calls resolutions order
    // being different from the promises registration order.
    Promise.resolve().then(function() {
      if (goog.isFunction(nextOrObserver)) {
        nextOrObserver(self.currentUser_());
      } else if (goog.isFunction(nextOrObserver['next'])) {
        nextOrObserver['next'](self.currentUser_());
      }
    });
  }
  return this.onIdTokenChanged_(
      /** @type {!firebase.Observer|function(*)|undefined} */ (nextOrObserver),
      /** @type {function(!Error)|undefined} */ (opt_error),
      opt_completed);
};


/**
 * Adds an observer for user state changes, we need to wrap the call as
 * the args checking code needs a method defined on the prototype this way,
 * not within the constructor, and we also have to implement the behavior
 * that will trigger an observer right away if state is ready.
 * @param {!firebase.Observer|function(?fireauth.AuthUser)}
 *     nextOrObserver An observer object or a function triggered on change.
 * @param {function(!fireauth.AuthError)=} opt_error Optional A function
 *     triggered on Auth error.
 * @param {function()=} opt_completed Optional A function triggered when the
 *     observer is removed.
 * @return {!function()} The unsubscribe function for the observer.
 */
fireauth.Auth.prototype.onAuthStateChanged = function(
    nextOrObserver, opt_error, opt_completed) {
  var self = this;
  // State already determined. Trigger immediately, otherwise initState will
  // take care of notifying all pending listeners on initialization.
  // In this case we do not trigger synchronously and trigger via a resolved
  // promise as required by specs.
  if (this.isStateResolved_) {
    // The observer cannot be called synchronously. We're using the
    // native Promise implementation as otherwise it creates weird behavior
    // where the order of promises resolution would not be as expected.
    // It is due to the fact fireauth and firebase.app use their own
    // and different promises library and this leads to calls resolutions order
    // being different from the promises registration order.
    Promise.resolve().then(function() {
      // This ensures that the first time notifyAuthListeners_ is triggered,
      // it has the correct UID before triggering the user state change
      // listeners.
      self.userStateChangeUid_ = self.getUid();
      if (goog.isFunction(nextOrObserver)) {
        nextOrObserver(self.currentUser_());
      } else if (goog.isFunction(nextOrObserver['next'])) {
        nextOrObserver['next'](self.currentUser_());
      }
    });
  }
  return this.onUserStateChanged_(
      /** @type {!firebase.Observer|function(*)|undefined} */ (nextOrObserver),
      /** @type {function(!Error)|undefined} */ (opt_error),
      opt_completed);
};


/**
 * Returns an STS token. If the cached one is unexpired it is directly returned.
 * Otherwise the existing ID token or refresh token is exchanged for a new one.
 * If there is no user signed in, returns null.
 *
 * This method is called getIdTokenInternal as the symbol getIdToken is not
 * obfuscated, which could lead to developers incorrectly calling
 * firebase.auth().getIdToken().
 *
 * @param {boolean=} opt_forceRefresh Whether to force refresh token exchange.
 * @return {!goog.Promise<?Object>}
 */
fireauth.Auth.prototype.getIdTokenInternal = function(opt_forceRefresh) {
  var self = this;
  // Wait for state to be ready.
  var p = this.redirectStateIsReady_.then(function() {
    // Call user's underlying getIdToken method.
    if (self.currentUser_()) {
      return self.currentUser_().getIdToken(opt_forceRefresh)
          .then(function(stsAccessToken) {
            // This is used internally by other services which expect the access
            // token to be returned in an object.
            return {
              'accessToken': stsAccessToken
            };
          });
    }
    // No logged in user, return null token.
    return null;
  });
  return /** @type {!goog.Promise<?Object>} */ (
      this.registerPendingPromise_(p));
};


/**
 * Signs in a user asynchronously using a custom token and returns any
 * additional user info data or credentials returned form the backend.
 * @param {string} token The custom token to sign in with.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.Auth.prototype.signInWithCustomToken = function(token) {
  var self = this;
  // Wait for the redirect state to be determined before proceeding. If critical
  // errors like web storage unsupported are detected, fail before RPC, instead
  // of after.
  return this.redirectStateIsReady_.then(function() {
    return self.signInWithIdTokenProvider_(
        self.getRpcHandler().verifyCustomToken(token));
  }).then(function(result) {
    var user = result['user'];
    // Manually sets the isAnonymous flag to false as the GetAccountInfo
    // response will look like an anonymous user (no credentials visible).
    user.updateProperty('isAnonymous', false);
    // Save isAnonymous flag changes to current user in storage.
    self.handleUserStateChange_(user);
    return result;
  });
};


/**
 * Sign in using an email and password and returns any additional user info
 * data or credentials returned form the backend.
 * @param {string} email The email to sign in with.
 * @param {string} password The password to sign in with.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.Auth.prototype.signInWithEmailAndPassword =
    function(email, password) {
  var self = this;
  // Wait for the redirect state to be determined before proceeding. If critical
  // errors like web storage unsupported are detected, fail before RPC, instead
  // of after.
  return this.redirectStateIsReady_.then(function() {
    return self.signInWithIdTokenProvider_(
        self.getRpcHandler().verifyPassword(email, password));
  });
};


/**
 * Creates a new email and password account and returns any additional user
 * info data or credentials returned form the backend.
 * @param {string} email The email to sign up with.
 * @param {string} password The password to sign up with.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.Auth.prototype.createUserWithEmailAndPassword =
    function(email, password) {
  var self = this;
  // Wait for the redirect state to be determined before proceeding. If critical
  // errors like web storage unsupported are detected, fail before RPC, instead
  // of after.
  return this.redirectStateIsReady_.then(function() {
    return self.signInWithIdTokenProvider_(
        self.getRpcHandler().createAccount(email, password));
  });
};


/**
 * Logs into Firebase with the given 3rd party credentials and returns any
 * additional user info data or credentials returned form the backend.
 * @param {!fireauth.AuthCredential} credential The Auth credential.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.Auth.prototype.signInWithCredential = function(credential) {
  // Credential could be extended in the future, so leave it to credential to
  // decide how to retrieve ID token.
  var self = this;
  // Wait for the redirect state to be determined before proceeding. If critical
  // errors like web storage unsupported are detected, fail before RPC, instead
  // of after.
  return this.redirectStateIsReady_.then(function() {
    // Return the full response object and not just the user.
    return self.signInWithIdTokenProvider_(
        credential.getIdTokenProvider(self.getRpcHandler()));
  });
};


/**
 * Logs into Firebase with the given 3rd party credentials and returns any
 * additional user info data or credentials returned form the backend. It has
 * been deprecated in favor of signInWithCredential.
 * @param {!fireauth.AuthCredential} credential The Auth credential.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.Auth.prototype.signInAndRetrieveDataWithCredential =
    function(credential) {
  fireauth.deprecation.log(
      fireauth.deprecation.Deprecations.SIGN_IN_WITH_CREDENTIAL);
  return this.signInWithCredential(credential);
};


/**
 * Signs in a user anonymously and returns any additional user info data or
 * credentials returned form the backend.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.Auth.prototype.signInAnonymously = function() {
  var self = this;
  // Wait for the redirect state to be determined before proceeding. If critical
  // errors like web storage unsupported are detected, fail before RPC, instead
  // of after.
  return this.redirectStateIsReady_.then(function() {
    var user = self.currentUser_();
    // If an anonymous user is already signed in, no need to sign him again.
    if (user && user['isAnonymous']) {
      var additionalUserInfo = fireauth.object.makeReadonlyCopy({
        'providerId': null,
        'isNewUser': false
      });
      return fireauth.object.makeReadonlyCopy({
        // Return the signed in user reference.
        'user': user,
        // Do not return credential for anonymous user.
        'credential': null,
        // Return any additional IdP data.
        'additionalUserInfo': additionalUserInfo,
        // Sign in operation type.
        'operationType': fireauth.constants.OperationType.SIGN_IN
      });
    } else {
      // No anonymous user currently signed in.
      return self.signInWithIdTokenProvider_(
          self.getRpcHandler().signInAnonymously())
          .then(function(result) {
            var user = result['user'];
            // Manually sets the isAnonymous flag to true as
            // initializeFromIdTokenResponse uses the default value of false and
            // even though getAccountInfo sets that to true, it will be reverted
            // to false in reloadWithoutSaving.
            // TODO: consider optimizing this and cleaning these manual
            // overwrites.
            user.updateProperty('isAnonymous', true);
            // Save isAnonymous flag changes to current user in storage.
            self.handleUserStateChange_(user);
            return result;
          });
    }
  });
};


/**
 * @return {string} The key used for storing Auth state.
 */
fireauth.Auth.prototype.getStorageKey = function() {
  return fireauth.util.createStorageKey(
      this.app_().options['apiKey'],
      this.app_().name);
};


/**
 * @return {!firebase.app.App} The Firebase App this auth object is connected
 *     to.
 * @private
 */
fireauth.Auth.prototype.app_ = function() {
  return this['app'];
};


/**
 * @return {!fireauth.RpcHandler} The RPC handler.
 */
fireauth.Auth.prototype.getRpcHandler = function() {
  return this.rpcHandler_;
};


/**
 * @return {?fireauth.AuthUser} The currently logged in user.
 * @private
 */
fireauth.Auth.prototype.currentUser_ = function() {
  return this['currentUser'];
};


/** @return {?string} The current user UID if available, null if not. */
fireauth.Auth.prototype.getUid = function() {
  return (this.currentUser_() && this.currentUser_()['uid']) || null;
};


/**
 * @return {?string} The last cached access token.
 * @private
 */
fireauth.Auth.prototype.getLastAccessToken_ = function() {
  return (this.currentUser_() && this.currentUser_()['_lat']) || null;
};



/**
 * Called internally on Auth state change to notify listeners.
 * @private
 */
fireauth.Auth.prototype.notifyAuthListeners_ = function() {
  // Only run when state is resolved. After state is resolved, the Auth listener
  // will always trigger.
  if (this.isStateResolved_) {
    for (var i = 0; i < this.authListeners_.length; i++) {
      if (this.authListeners_[i]) {
        this.authListeners_[i](this.getLastAccessToken_());
      }
    }
    // Trigger user change only if UID changed.
    if (this.userStateChangeUid_ !== this.getUid() &&
        this.userChangeListeners_.length) {
      // Update user state change UID.
      this.userStateChangeUid_ = this.getUid();
      // Trigger all subscribed user state change listeners.
      for (var i = 0; i < this.userChangeListeners_.length; i++) {
        if (this.userChangeListeners_[i]) {
          this.userChangeListeners_[i](this.getLastAccessToken_());
        }
      }
    }
  }
};


/**
 * Attaches a listener function to Auth state change.
 * This is used only by internal Firebase services.
 * @param {!function(?string)} listener The auth state change listener.
 */
fireauth.Auth.prototype.addAuthTokenListenerInternal = function(listener) {
  this.addAuthTokenListener(listener);
  // This is not exact science but should be good enough to detect Firebase
  // services subscribing to Auth token changes.
  // This is needed to start proactive token refresh on a user.
  this.firebaseServices_++;
  if (this.firebaseServices_ > 0 && this.currentUser_()) {
    // Start proactive token refresh on the current user.
    this.currentUser_().startProactiveRefresh();
  }
};


/**
 * Detaches the provided listener from Auth state change event.
 * This is used only by internal Firebase services.
 * @param {!function(?string)} listener The Auth state change listener.
 */
fireauth.Auth.prototype.removeAuthTokenListenerInternal = function(listener) {
  // This is unlikely to be called by Firebase services. Services are unlikely
  // to remove Auth token listeners.
  // Make sure listener is still subscribed before decrementing.
  var self = this;
  goog.array.forEach(this.authListeners_, function(ele) {
    // This covers the case where the same listener is subscribed more than
    // once.
    if (ele == listener) {
      self.firebaseServices_--;
    }
  });
  if (this.firebaseServices_ < 0) {
    this.firebaseServices_ = 0;
  }
  if (this.firebaseServices_ == 0 && this.currentUser_()) {
    // Stop proactive token refresh on the current user.
    this.currentUser_().stopProactiveRefresh();
  }
  this.removeAuthTokenListener(listener);
};


/**
 * Attaches a listener function to Auth state change.
 * @param {!function(?string)} listener The Auth state change listener.
 */
fireauth.Auth.prototype.addAuthTokenListener = function(listener) {
  var self = this;
  // Save listener.
  this.authListeners_.push(listener);
  // Make sure redirect state is ready and then trigger listener.
  this.registerPendingPromise_(this.redirectStateIsReady_.then(function() {
    // Do nothing if deleted.
    if (self.deleted_) {
      return;
    }
    // Make sure listener is still subscribed.
    if (goog.array.contains(self.authListeners_, listener)) {
      // Trigger the first call for this now that redirect state is resolved.
      listener(self.getLastAccessToken_());
    }
  }));
};


/**
 * Detaches the provided listener from Auth state change event.
 * @param {!function(?string)} listener The Auth state change listener.
 */
fireauth.Auth.prototype.removeAuthTokenListener = function(listener) {
  // Remove from Auth listeners.
  goog.array.removeAllIf(this.authListeners_, function(ele) {
    return ele == listener;
  });
};


/**
 * Attaches a listener function to user state change.
 * @param {!function(?string)} listener The user state change listener.
 * @private
 */
fireauth.Auth.prototype.addUserChangeListener_ = function(listener) {
  var self = this;
  // Save listener.
  this.userChangeListeners_.push(listener);
  // Make sure redirect state is ready and then trigger listener.
  this.registerPendingPromise_(this.redirectStateIsReady_.then(function() {
    // Do nothing if deleted.
    if (self.deleted_) {
      return;
    }
    // Make sure listener is still subscribed.
    if (goog.array.contains(self.userChangeListeners_, listener)) {
      // Confirm UID change before triggering.
      if (self.userStateChangeUid_ !== self.getUid()) {
        self.userStateChangeUid_ = self.getUid();
        // Trigger the first call for this now that redirect state is resolved.
        listener(self.getLastAccessToken_());
      }
    }
  }));
};


/**
 * Deletes the Auth instance, handling cancellation of all pending async Auth
 * operations.
 * @return {!Promise<void>}
 */
fireauth.Auth.prototype.delete = function() {
  this.deleted_ = true;
  // Cancel all pending promises.
  for (var i = 0; i < this.pendingPromises_.length; i++) {
    this.pendingPromises_[i].cancel(fireauth.authenum.Error.MODULE_DESTROYED);
  }

  // Empty pending promises array.
  this.pendingPromises_ = [];
  // Remove current user change listener.
  if (this.userStorageManager_) {
    this.userStorageManager_.removeCurrentUserChangeListener(
        this.getSyncAuthUserChanges_);
  }
  // Unsubscribe from Auth event handling.
  if (this.authEventManager_) {
    this.authEventManager_.unsubscribe(this);
    this.authEventManager_.clearRedirectResult();
  }
  return Promise.resolve();
};


/** @return {boolean} Whether Auth instance has pending promises. */
fireauth.Auth.prototype.hasPendingPromises = function() {
  return this.pendingPromises_.length != 0;
};


/**
 * Takes in a pending promise, saves it and adds a clean up callback which
 * forgets the pending promise after it is fulfilled and echoes the promise
 * back.
 * @param {!goog.Promise<*, *>|!goog.Promise<void>} p The pending promise.
 * @return {!goog.Promise<*, *>|!goog.Promise<void>}
 * @private
 */
fireauth.Auth.prototype.registerPendingPromise_ = function(p) {
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


/**
 * Gets the list of possible sign in methods for the given email address.
 * @param {string} email The email address.
 * @return {!goog.Promise<!Array<string>>}
 */
fireauth.Auth.prototype.fetchSignInMethodsForEmail = function(email) {
  return /** @type {!goog.Promise<!Array<string>>} */ (
      this.registerPendingPromise_(
          this.getRpcHandler().fetchSignInMethodsForIdentifier(email)));
};


/**
 * @param {string} emailLink The email link.
 * @return {boolean} Whether the link is a sign in with email link.
 */
fireauth.Auth.prototype.isSignInWithEmailLink = function(emailLink) {
  return  !!fireauth.EmailAuthProvider
      .getActionCodeFromSignInEmailLink(emailLink);
};


/**
 * Sends the sign-in with email link for the email account provided.
 * @param {string} email The email account to sign in with.
 * @param {!Object} actionCodeSettings The action code settings object.
 * @return {!goog.Promise<void>}
 */
fireauth.Auth.prototype.sendSignInLinkToEmail = function(
    email, actionCodeSettings) {
  var self = this;
  return this.registerPendingPromise_(
      // Wrap in promise as ActionCodeSettings constructor could throw a
      // synchronous error if invalid arguments are specified.
      goog.Promise.resolve()
          .then(function() {
            var actionCodeSettingsBuilder =
                new fireauth.ActionCodeSettings(actionCodeSettings);
            if (!actionCodeSettingsBuilder.canHandleCodeInApp()) {
              throw new fireauth.AuthError(
                  fireauth.authenum.Error.ARGUMENT_ERROR,
                  fireauth.ActionCodeSettings.RawField.HANDLE_CODE_IN_APP +
                  ' must be true when sending sign in link to email');
            }
            return actionCodeSettingsBuilder.buildRequest();
          }).then(function(additionalRequestData) {
            return self.getRpcHandler().sendSignInLinkToEmail(
                email, additionalRequestData);
          }).then(function(email) {
            // Do not return the email.
          }));
};


/**
 * Verifies an email action code for password reset and returns a promise
 * that resolves with the associated email if verified.
 * @param {string} code The email action code to verify for password reset.
 * @return {!goog.Promise<string>}
 */
fireauth.Auth.prototype.verifyPasswordResetCode = function(code) {
  return this.checkActionCode(code).then(function(info) {
    return info['data']['email'];
  });
};


/**
 * Requests resetPassword endpoint for password reset, verifies the action code
 * and updates the new password, returns an empty promise.
 * @param {string} code The email action code to confirm for password reset.
 * @param {string} newPassword The new password.
 * @return {!goog.Promise<undefined, !fireauth.AuthError>}
 */
fireauth.Auth.prototype.confirmPasswordReset = function(code, newPassword) {
  return this.registerPendingPromise_(
      this.getRpcHandler().confirmPasswordReset(code, newPassword)
      .then(function(email) {
        // Do not return the email.
      }));
};


/**
 * Verifies an email action code and returns an empty promise if verified.
 * @param {string} code The email action code to verify for password reset.
 * @return {!goog.Promise<!Object>}
 */
fireauth.Auth.prototype.checkActionCode = function(code) {
  return this.registerPendingPromise_(
      this.getRpcHandler().checkActionCode(code)
      .then(function(response) {
        return new fireauth.ActionCodeInfo(response);
      }));
};


/**
 * Applies an out-of-band email action code, such as an email verification code.
 * @param {string} code The email action code.
 * @return {!goog.Promise<void>}
 */
fireauth.Auth.prototype.applyActionCode = function(code) {
  return this.registerPendingPromise_(
      this.getRpcHandler().applyActionCode(code)
      .then(function(email) {
        // Returns nothing.
      }));
};


/**
 * Sends the password reset email for the email account provided.
 * @param {string} email The email account with the password to be reset.
 * @param {?Object=} opt_actionCodeSettings The optional action code settings
 *     object.
 * @return {!goog.Promise<void>}
 */
fireauth.Auth.prototype.sendPasswordResetEmail =
    function(email, opt_actionCodeSettings) {
  var self = this;
  return this.registerPendingPromise_(
      // Wrap in promise as ActionCodeSettings constructor could throw a
      // synchronous error if invalid arguments are specified.
      goog.Promise.resolve().then(function() {
        if (typeof opt_actionCodeSettings !== 'undefined' &&
            // Ignore empty objects.
            !goog.object.isEmpty(opt_actionCodeSettings)) {
          return new fireauth.ActionCodeSettings(
              /** @type {!Object} */ (opt_actionCodeSettings)).buildRequest();
        }
        return {};
      })
      .then(function(additionalRequestData) {
        return self.getRpcHandler().sendPasswordResetEmail(
            email, additionalRequestData);
      }).then(function(email) {
        // Do not return the email.
      }));
};


/**
 * Signs in with a phone number using the app verifier instance and returns a
 * promise that resolves with the confirmation result which on confirmation
 * will resolve with the UserCredential object.
 * @param {string} phoneNumber The phone number to authenticate with.
 * @param {!firebase.auth.ApplicationVerifier} appVerifier The application
 *     verifier.
 * @return {!goog.Promise<!fireauth.ConfirmationResult>}
 */
fireauth.Auth.prototype.signInWithPhoneNumber =
    function(phoneNumber, appVerifier) {
  return /** @type {!goog.Promise<!fireauth.ConfirmationResult>} */ (
      this.registerPendingPromise_(fireauth.ConfirmationResult.initialize(
          this,
          phoneNumber,
          appVerifier,
          // This will wait for redirectStateIsReady to resolve first.
          goog.bind(this.signInWithCredential, this))));
};


/**
 * Signs in a Firebase User with the provided email and the passwordless
 * sign-in email link.
 * @param {string} email The email account to sign in with.
 * @param {?string=} opt_link The optional link which contains the OTP needed
 *     to complete the sign in with email link. If not specified, the current
 *     URL is used instead.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.Auth.prototype.signInWithEmailLink = function(email, opt_link) {
  var self = this;
  return this.registerPendingPromise_(
      goog.Promise.resolve().then(function() {
        var credential = fireauth.EmailAuthProvider.credentialWithLink(
            email, opt_link || fireauth.util.getCurrentUrl());
        return self.signInWithCredential(credential);
      }));
};
