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
 * @fileoverview Defines the user info pertaining to an identity provider and
 * the Firebase user object.
 */

goog.provide('fireauth.AuthUser');
goog.provide('fireauth.AuthUser.AccountInfo');
goog.provide('fireauth.AuthUserInfo');
goog.provide('fireauth.TokenRefreshTime');
goog.provide('fireauth.UserMetadata');

goog.require('fireauth.ActionCodeSettings');
goog.require('fireauth.AdditionalUserInfo');
goog.require('fireauth.AuthCredential');
goog.require('fireauth.AuthError');
goog.require('fireauth.AuthEvent');
goog.require('fireauth.AuthEventHandler');
goog.require('fireauth.AuthEventManager');
goog.require('fireauth.AuthProvider');
goog.require('fireauth.ConfirmationResult');
goog.require('fireauth.IdTokenResult');
goog.require('fireauth.MultiFactorError');
goog.require('fireauth.MultiFactorUser');
goog.require('fireauth.PhoneAuthProvider');
goog.require('fireauth.ProactiveRefresh');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.StsTokenManager');
goog.require('fireauth.UserEvent');
goog.require('fireauth.UserEventType');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.constants');
goog.require('fireauth.constants.AuthEventType');
goog.require('fireauth.deprecation');
goog.require('fireauth.idp');
goog.require('fireauth.iframeclient.IfcHandler');
goog.require('fireauth.object');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.array');
goog.require('goog.events');
goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('goog.object');



/**
 * Initializes an instance of a user metadata object.
 * @param {?string=} opt_createdAt The optional creation date UTC timestamp.
 * @param {?string=} opt_lastLoginAt The optional last login date UTC timestamp.
 * @constructor
 */
fireauth.UserMetadata = function(opt_createdAt, opt_lastLoginAt) {
  /** @private {?string} The created at UTC timestamp. */
  this.createdAt_ = opt_createdAt || null;
  /** @private {?string} The last login at UTC timestamp. */
  this.lastLoginAt_ = opt_lastLoginAt || null;
  fireauth.object.setReadonlyProperties(this, {
    'lastSignInTime': fireauth.util.utcTimestampToDateString(
        opt_lastLoginAt || null),
    'creationTime': fireauth.util.utcTimestampToDateString(
        opt_createdAt || null),
  });
};


/**
 * @return {!fireauth.UserMetadata} A clone of the current user metadata object.
 */
fireauth.UserMetadata.prototype.clone = function() {
  return new fireauth.UserMetadata(this.createdAt_, this.lastLoginAt_);
};


/**
 * @return {!Object} The object representation of the user metadata instance.
 */
fireauth.UserMetadata.prototype.toPlainObject = function() {
  return {
    'lastLoginAt': this.lastLoginAt_,
    'createdAt': this.createdAt_
  };
};


/**
 * Initializes an instance of the user info for an identity provider.
 * @param {string} uid The user ID.
 * @param {!fireauth.idp.ProviderId} providerId The provider ID.
 * @param {?string=} opt_email The optional user email.
 * @param {?string=} opt_displayName The optional display name.
 * @param {?string=} opt_photoURL The optional photo URL.
 * @param {?string=} opt_phoneNumber The optional phone number.
 * @constructor
 */
fireauth.AuthUserInfo = function(
    uid,
    providerId,
    opt_email,
    opt_displayName,
    opt_photoURL,
    opt_phoneNumber) {
  fireauth.object.setReadonlyProperties(this, {
    'uid': uid,
    'displayName': opt_displayName || null,
    'photoURL': opt_photoURL || null,
    'email': opt_email || null,
    'phoneNumber': opt_phoneNumber || null,
    'providerId': providerId
  });
};


/**
 * Defines the proactive token refresh time constraints in milliseconds.
 * @enum {number}
 */
fireauth.TokenRefreshTime = {
  /**
   * The offset time before token natural expiration to run the refresh.
   * This is currently 5 minutes.
   */
  OFFSET_DURATION: 5 * 60 * 1000,
  /**
   * This is the first retrial wait after an error. This is currently
   * 30 seconds.
   */
  RETRIAL_MIN_WAIT: 30 * 1000,
  /**
   * This is the maximum retrial wait, currently 16 minutes.
   */
  RETRIAL_MAX_WAIT: 16 * 60 * 1000
};



/**
 * The Firebase user.
 * @param {!Object} appOptions The application options.
 * @param {!Object} stsTokenResponse The server STS token response.
 * @param {?Object=} opt_accountInfo The optional user account info.
 * @constructor
 * @extends {goog.events.EventTarget}
 * @implements {fireauth.AuthEventHandler}
 */
fireauth.AuthUser =
    function(appOptions, stsTokenResponse, opt_accountInfo) {
  /** @private {!Array<!goog.Promise<*, *>|!goog.Promise<void>>} List of pending
   *      promises. */
  this.pendingPromises_ = [];
  // User is only created via Auth so API key should always be available.
  /** @private {string} The API key. */
  this.apiKey_ = /** @type {string} */ (appOptions['apiKey']);
  // This is needed to associate a user to the corresponding Auth instance.
  /** @private {string} The App name. */
  this.appName_ = /** @type {string} */ (appOptions['appName']);
  /** @private {?string} The Auth domain. */
  this.authDomain_ = appOptions['authDomain'] || null;
  var clientFullVersion = firebase.SDK_VERSION ?
      fireauth.util.getClientVersion(
          fireauth.util.ClientImplementation.JSCORE, firebase.SDK_VERSION) :
      null;
  /** @private {!fireauth.RpcHandler} The RPC handler instance. */
  this.rpcHandler_ = new fireauth.RpcHandler(
      this.apiKey_,
      // Get the client Auth endpoint used.
      fireauth.constants.getEndpointConfig(fireauth.constants.clientEndpoint),
    clientFullVersion);
  if (appOptions['emulatorConfig']) {
    this.rpcHandler_.updateEmulatorConfig(appOptions['emulatorConfig']);
  }
  // TODO: Consider having AuthUser take a fireauth.StsTokenManager
  // instance instead of a token response but make sure lastAccessToken_ also
  // initialized at the right time. In this case initializeFromIdTokenResponse
  // will take in a token response object and convert it to an instance of
  // fireauth.StsTokenManager to properly initialize user.
  /** @private {!fireauth.StsTokenManager} The STS token manager instance. */
  this.stsTokenManager_ = new fireauth.StsTokenManager(this.rpcHandler_);

  this.setLastAccessToken_(
      stsTokenResponse[fireauth.RpcHandler.AuthServerField.ID_TOKEN]);
  // STS token manager will always be populated using server response.
  this.stsTokenManager_.parseServerResponse(stsTokenResponse);
  fireauth.object.setReadonlyProperty(
      this, 'refreshToken', this.stsTokenManager_.getRefreshToken());
  this.setAccountInfo(/** @type {!fireauth.AuthUser.AccountInfo} */ (
      opt_accountInfo || {}));
  // Add call to superclass constructor.
  fireauth.AuthUser.base(this, 'constructor');
  /** @private {boolean} Whether popup and redirect is enabled on the user. */
  this.popupRedirectEnabled_ = false;
  if (this.authDomain_ &&
      fireauth.AuthEventManager.ENABLED &&
      // Make sure popup and redirects are supported in the current environment.
      fireauth.util.isPopupRedirectSupported()) {
    // Get the Auth event manager associated with this user.
    this.authEventManager_ = fireauth.AuthEventManager.getManager(
        this.authDomain_, this.apiKey_, this.appName_);
  }
  /** @private {!Array<!function(!fireauth.AuthUser):!goog.Promise>} The list of
   *      state change listeners. This is needed to make sure state changes are
   *      resolved before resolving user API promises. For example redirect
   *      operations should make sure the associated event ID is saved before
   *      redirecting.
   */
  this.stateChangeListeners_ = [];
  /**
   * @private {?fireauth.AuthError} The user invalidation error if it exists.
   */
  this.userInvalidatedError_ = null;
  /**
   * @private {!fireauth.ProactiveRefresh} The reference to the proactive token
   *     refresher utility for the current user.
   */
  this.proactiveRefresh_ = this.initializeProactiveRefreshUtility_();
  /**
   * @private {!function(!Object)} The handler for user token changes used to
   *     realign the proactive token refresh with external token refresh calls.
   */
  this.userTokenChangeListener_ = goog.bind(this.handleUserTokenChange_, this);
  var self = this;
  /** @private {?string} The current user's language code. */
  this.languageCode_ = null;
  /**
   * @private {function(!goog.events.Event)} The on language code changed event
   *     handler.
   */
  this.onLanguageCodeChanged_ = function(event) {
    // Update the user language code.
    self.setLanguageCode(event.languageCode);
  };
  /**
   * @private {?goog.events.EventTarget} The language code change event
   *     dispatcher.
   */
  this.languageCodeChangeEventDispatcher_ = null;

  /**
   * @private {function(!goog.events.Event)} The on emulator config changed
   *     event handler.
   */
  this.onEmulatorConfigChanged_ = function (event) {
    // Update the emulator config.
    self.setEmulatorConfig(event.emulatorConfig);
  };
  /**
   * @private {?goog.events.EventTarget} The emulator code change event
   *     dispatcher.
   */
  this.emulatorConfigChangeEventDispatcher_ = null;

  /** @private {!Array<string>} The current Firebase frameworks. */
  this.frameworks_ = [];
  /**
   * @private {function(!goog.events.Event)} The on framework list changed event
   *     handler.
   */
  this.onFrameworkChanged_ = function(event) {
    // Update the Firebase frameworks.
    self.setFramework(event.frameworks);
  };
  /**
   * @private {?goog.events.EventTarget} The framework change event dispatcher.
   */
  this.frameworkChangeEventDispatcher_ = null;
  /**
   * @const @private {!fireauth.MultiFactorUser} The multifactor user instance.
   */
  this.multiFactorUser_ = new fireauth.MultiFactorUser(
      this, /** @type {?fireauth.AuthUser.AccountInfo|undefined} */ (
          opt_accountInfo));
  fireauth.object.setReadonlyProperty(
      this, 'multiFactor', this.multiFactorUser_);
};
goog.inherits(fireauth.AuthUser, goog.events.EventTarget);


/**
 * Updates the user language code.
 * @param {?string} languageCode The current language code to use in user
 *     requests.
 */
fireauth.AuthUser.prototype.setLanguageCode = function(languageCode) {
  // Save current language.
  this.languageCode_ = languageCode;
  // Update the custom locale header.
  this.rpcHandler_.updateCustomLocaleHeader(languageCode);
};


/**
 * Updates the emulator config.
 * @param {?fireauth.constants.EmulatorSettings} emulatorConfig The current
 *     emulator config to use in user requests.
 */
fireauth.AuthUser.prototype.setEmulatorConfig = function(emulatorConfig) {
  // Update the emulator config.
  this.rpcHandler_.updateEmulatorConfig(emulatorConfig);
};


/** @return {?string} The current user's language code. */
fireauth.AuthUser.prototype.getLanguageCode = function() {
  return this.languageCode_;
};


/**
 * Listens to language code changes triggered by the provided dispatcher.
 * @param {?goog.events.EventTarget} dispatcher The language code changed event
 *     dispatcher.
 */
fireauth.AuthUser.prototype.setLanguageCodeChangeDispatcher =
    function(dispatcher) {
  // Remove any previous listener.
  if (this.languageCodeChangeEventDispatcher_) {
    goog.events.unlisten(
        this.languageCodeChangeEventDispatcher_,
        fireauth.constants.AuthEventType.LANGUAGE_CODE_CHANGED,
        this.onLanguageCodeChanged_);
  }
  // Update current dispatcher.
  this.languageCodeChangeEventDispatcher_ = dispatcher;
  // Using an event listener makes it easy for non-currentUsers to detect
  // language changes on the parent Auth instance. A developer could still call
  // APIs that require localization on signed out user references.
  if (dispatcher) {
    goog.events.listen(
        dispatcher,
        fireauth.constants.AuthEventType.LANGUAGE_CODE_CHANGED,
        this.onLanguageCodeChanged_);
  }
};


/**
  * Listens to emulator config changes triggered by the provided dispatcher.
  * @param {?goog.events.EventTarget} dispatcher The emulator config changed
  *     event dispatcher.
  */
fireauth.AuthUser.prototype.setEmulatorConfigChangeDispatcher = function(dispatcher) {
  // Remove any previous listener.
  if (this.emulatorConfigChangeEventDispatcher_) {
    goog.events.unlisten(
      this.emulatorConfigChangeEventDispatcher_,
      fireauth.constants.AuthEventType.EMULATOR_CONFIG_CHANGED,
      this.onEmulatorConfigChanged_);
  }
  // Update current dispatcher.
  this.emulatorConfigChangeEventDispatcher_ = dispatcher;
  // Using an event listener makes it easy for non-currentUsers to detect
  // emulator changes on the parent Auth instance. A developer could still
  // call APIs that require emulation on signed out user references.
  if (dispatcher) {
    goog.events.listen(
      dispatcher, fireauth.constants.AuthEventType.EMULATOR_CONFIG_CHANGED,
      this.onEmulatorConfigChanged_);
  }
}


/**
 * Updates the Firebase frameworks on the current user.
 * @param {!Array<string>} framework The list of Firebase frameworks.
 */
fireauth.AuthUser.prototype.setFramework = function(framework) {
  // Save current frameworks.
  this.frameworks_ = framework;
  // Update the client version in RPC handler with the new frameworks.
  this.rpcHandler_.updateClientVersion(firebase.SDK_VERSION ?
        fireauth.util.getClientVersion(
            fireauth.util.ClientImplementation.JSCORE, firebase.SDK_VERSION,
            this.frameworks_) :
        null);
};


/** @return {!Array<string>} The current Firebase frameworks. */
fireauth.AuthUser.prototype.getFramework = function() {
  return goog.array.clone(this.frameworks_);
};


/**
 * Listens to framework changes triggered by the provided dispatcher.
 * @param {?goog.events.EventTarget} dispatcher The framework changed event
 *     dispatcher.
 */
fireauth.AuthUser.prototype.setFrameworkChangeDispatcher =
    function(dispatcher) {
  // Remove any previous listener.
  if (this.frameworkChangeEventDispatcher_) {
    goog.events.unlisten(
        this.frameworkChangeEventDispatcher_,
        fireauth.constants.AuthEventType.FRAMEWORK_CHANGED,
        this.onFrameworkChanged_);
  }
  // Update current dispatcher.
  this.frameworkChangeEventDispatcher_ = dispatcher;
  // Using an event listener makes it easy for non-currentUsers to detect
  // framework changes on the parent Auth instance.
  if (dispatcher) {
    goog.events.listen(
        dispatcher,
        fireauth.constants.AuthEventType.FRAMEWORK_CHANGED,
        this.onFrameworkChanged_);
  }
};


/**
 * Handles user token changes. Currently used to realign the proactive token
 * refresh internal timing with successful external token refreshes.
 * @param {!Object} event The token change event.
 * @private
 */
fireauth.AuthUser.prototype.handleUserTokenChange_ = function(event) {
  // If an external service refreshes the token, reset the proactive token
  // refresh utility in case it is still running so the next run time is
  // up to date.
  // This will currently also trigger when the proactive refresh succeeds.
  // This is not ideal but should not have any downsides. It just adds a
  // redundant reset which can be optimized not to run in the future.
  if (this.proactiveRefresh_.isRunning()) {
    this.proactiveRefresh_.stop();
    this.proactiveRefresh_.start();
  }
};


/**
 * @return {!fireauth.Auth} The corresponding Auth instance that created the
 *     current user.
 * @private
 */
fireauth.AuthUser.prototype.getAuth_ = function() {
  try {
    // Get the Auth instance for the current app identified by the App name.
    // This could fail if, for example, the App instance was deleted.
    return firebase['app'](this.appName_)['auth']();
  } catch (e) {
    // Throw appropriate error.
    throw new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR,
        'No firebase.auth.Auth instance is available for the Firebase App ' +
        '\'' + this.appName_ + '\'!');
  }
};


/**
 * @return {string} The user's API key.
 */
fireauth.AuthUser.prototype.getApiKey = function() {
  return this.apiKey_;
};


/**
 * Returns the RPC handler of the user.
 * @return {!fireauth.RpcHandler} The RPC handler.
 */
fireauth.AuthUser.prototype.getRpcHandler = function() {
  return this.rpcHandler_;
};


/**
 * Used to initialize the current user's proactive token refresher utility.
 * @return {!fireauth.ProactiveRefresh} The user's proactive token refresh
 *     utility.
 * @private
 */
fireauth.AuthUser.prototype.initializeProactiveRefreshUtility_ = function() {
  var self = this;
  return new fireauth.ProactiveRefresh(
      // Force ID token refresh right before expiration.
      function() {
        // Keep in mind when this fails for any reason other than a network
        // error, it will effectively stop the proactive refresh.
        return self.getIdToken(true);
      },
      // Retry only on network errors.
      function(error) {
        if (error && error.code == 'auth/network-request-failed') {
          return true;
        }
        return false;
      },
      // Return next time to run with offset applied.
      function() {
        // Get time until expiration minus the refresh offset.
        var waitInterval =
            self.stsTokenManager_.getExpirationTime() - goog.now() -
            fireauth.TokenRefreshTime.OFFSET_DURATION;
        // Set to zero if wait interval is negative.
        return waitInterval > 0 ? waitInterval : 0;
      },
      // Retrial minimum wait.
      fireauth.TokenRefreshTime.RETRIAL_MIN_WAIT,
      // Retrial maximum wait.
      fireauth.TokenRefreshTime.RETRIAL_MAX_WAIT,
      // Do not run in background as it is common to have multiple tabs open
      // in a browser and this could increase QPS on server.
      false);
};


/** Starts token proactive refresh. */
fireauth.AuthUser.prototype.startProactiveRefresh = function() {
  // Only allow if not destroyed and not already started.
  if (!this.destroyed_ && !this.proactiveRefresh_.isRunning()) {
    this.proactiveRefresh_.start();
    // Unlisten any previous token change listener.
    goog.events.unlisten(
        this,
        fireauth.UserEventType.TOKEN_CHANGED,
        this.userTokenChangeListener_);
    // Listen to token changes to reset the token refresher.
    goog.events.listen(
        this,
        fireauth.UserEventType.TOKEN_CHANGED,
        this.userTokenChangeListener_);
  }
};


/** Stops token proactive refresh. */
fireauth.AuthUser.prototype.stopProactiveRefresh = function() {
  // Remove internal token change listener.
  goog.events.unlisten(
      this,
      fireauth.UserEventType.TOKEN_CHANGED,
      this.userTokenChangeListener_);
  // Stop proactive token refresh.
  this.proactiveRefresh_.stop();
};


/**
 * Sets latest access token for the AuthUser object.
 * @param {string} lastAccessToken
 * @private
 */
fireauth.AuthUser.prototype.setLastAccessToken_ = function(lastAccessToken) {
  /** @private {?string} Latest access token. */
  this.lastAccessToken_ = lastAccessToken;
  fireauth.object.setReadonlyProperty(this, '_lat', lastAccessToken);
};


/**
 * @param {function(!fireauth.AuthUser):!goog.Promise} listener The listener
 *     to state changes to add.
 */
fireauth.AuthUser.prototype.addStateChangeListener = function(listener) {
  this.stateChangeListeners_.push(listener);
};


/**
 * @param {function(!fireauth.AuthUser):!goog.Promise} listener The listener
 *     to state changes to remove.
 */
fireauth.AuthUser.prototype.removeStateChangeListener = function(listener) {
  goog.array.removeAllIf(this.stateChangeListeners_, function(ele) {
    return ele == listener;
  });
};


/**
 * Executes all state change listener promises and when all fulfilled, resolves
 * with the current user.
 * @return {!goog.Promise} A promise that resolves when all state listeners
 *     fulfilled.
 * @private
 */
fireauth.AuthUser.prototype.notifyStateChangeListeners_ = function() {
  var promises = [];
  var self = this;
  for (var i = 0; i < this.stateChangeListeners_.length; i++) {
    // Run listener with Auth user instance and add to list of promises.
    promises.push(this.stateChangeListeners_[i](this));
  }
  return goog.Promise.allSettled(promises).then(function(results) {
    // State change errors should be recoverable even if errors occur.
    return self;
  });
};


/**
 * Sets the user current pending popup event ID.
 * @param {string} eventId The pending popup event ID.
 */
fireauth.AuthUser.prototype.setPopupEventId = function(eventId) {
  // Saving a popup event in a separate property other than redirectEventId
  // would prevent a pending redirect event from being overwritten by a newly
  // called popup operation.
  this.popupEventId_ = eventId;
};


/**
 * @return {?string} The pending popup event ID.
 */
fireauth.AuthUser.prototype.getPopupEventId = function() {
  return this.popupEventId_ || null;
};


/**
 * Sets the user current pending redirect event ID.
 * @param {string} eventId The pending redirect event ID.
 */
fireauth.AuthUser.prototype.setRedirectEventId = function(eventId) {
  this.redirectEventId_ = eventId;
};


/**
 * @return {?string} The pending redirect event ID.
 */
fireauth.AuthUser.prototype.getRedirectEventId = function() {
  return this.redirectEventId_ || null;
};


/**
 * Subscribes to Auth event manager to handle popup and redirect events.
 * This is an explicit operation as users could exist in temporary states. For
 * example a user change could be detected in another tab. When syncing to those
 * changes, a temporary user is retrieved from storage and then copied to
 * existing user. The temporary user should not subscribe to Auth event changes.
 */
fireauth.AuthUser.prototype.enablePopupRedirect = function() {
  // Subscribe to Auth event manager if available.
  if (this.authEventManager_ && !this.popupRedirectEnabled_) {
    this.popupRedirectEnabled_ = true;
    this.authEventManager_.subscribe(this);
  }
};


/**
 * getAccountInfo users field.
 * @const {string}
 */
fireauth.AuthUser.GET_ACCOUNT_INFO_USERS = 'users';


/**
 * getAccountInfo response user fields.
 * @enum {string}
 */
fireauth.AuthUser.GetAccountInfoField = {
  CREATED_AT: 'createdAt',
  DISPLAY_NAME: 'displayName',
  EMAIL: 'email',
  EMAIL_VERIFIED: 'emailVerified',
  LAST_LOGIN_AT: 'lastLoginAt',
  LOCAL_ID: 'localId',
  PASSWORD_HASH: 'passwordHash',
  PASSWORD_UPDATED_AT: 'passwordUpdatedAt',
  PHONE_NUMBER: 'phoneNumber',
  PHOTO_URL: 'photoUrl',
  PROVIDER_USER_INFO: 'providerUserInfo',
  TENANT_ID: 'tenantId'
};


/**
 * setAccountInfo response user fields.
 * @enum {string}
 */
fireauth.AuthUser.SetAccountInfoField = {
  DISPLAY_NAME: 'displayName',
  EMAIL: 'email',
  PHOTO_URL: 'photoUrl',
  PROVIDER_ID: 'providerId',
  PROVIDER_USER_INFO: 'providerUserInfo'
};


/**
 * getAccountInfo response provider user info fields.
 * @enum {string}
 */
fireauth.AuthUser.GetAccountInfoProviderField = {
  DISPLAY_NAME: 'displayName',
  EMAIL: 'email',
  PHOTO_URL: 'photoUrl',
  PHONE_NUMBER: 'phoneNumber',
  PROVIDER_ID: 'providerId',
  RAW_ID: 'rawId'
};


/**
 * verifyAssertion response fields.
 * @enum {string}
 */
fireauth.AuthUser.VerifyAssertionField = {
  ID_TOKEN: 'idToken',
  PROVIDER_ID: 'providerId'
};


/** @return {!fireauth.StsTokenManager} The STS token manager instance */
fireauth.AuthUser.prototype.getStsTokenManager = function() {
  return this.stsTokenManager_;
};


/**
 * Sets the user account info.
 * @param {!fireauth.AuthUser.AccountInfo} accountInfo The account information
 *     from the default provider.
 */
fireauth.AuthUser.prototype.setAccountInfo = function(accountInfo) {
  fireauth.object.setReadonlyProperties(this, {
    'uid': accountInfo['uid'],
    'displayName': accountInfo['displayName'] || null,
    'photoURL': accountInfo['photoURL'] || null,
    'email': accountInfo['email'] || null,
    'emailVerified': accountInfo['emailVerified'] || false,
    'phoneNumber': accountInfo['phoneNumber'] || null,
    'isAnonymous': accountInfo['isAnonymous'] || false,
    'tenantId': accountInfo['tenantId'] || null,
    'metadata': new fireauth.UserMetadata(
        accountInfo['createdAt'], accountInfo['lastLoginAt']),
    'providerData': []
  });
  // Sets the tenant ID on RPC handler. For requests with ID tokens, the source
  // of truth is the tenant ID in the ID token. If the request body has a
  // tenant ID (optional here), the backend will confirm it matches the
  // tenant ID in the ID token, otherwise throw an error. If no tenant ID is
  // passed in the request, it will be determined from the ID token.
  this.rpcHandler_.updateTenantId(this['tenantId']);
};


/**
 * Type specifying the parameters that can be passed to the
 * {@code fireauth.AuthUser} constructor.
 * @typedef {{
 *   uid: (?string|undefined),
 *   displayName: (?string|undefined),
 *   photoURL: (?string|undefined),
 *   email: (?string|undefined),
 *   emailVerified: ?boolean,
 *   phoneNumber: (?string|undefined),
 *   isAnonymous: ?boolean,
 *   createdAt: (?string|undefined),
 *   lastLoginAt: (?string|undefined),
 *   tenantId: (?string|undefined),
 *   multiFactor: ({
 *     enrolledFactors: (?Array<!fireauth.MultiFactorInfo>|undefined)
 *   }|undefined)
 * }}
 */
fireauth.AuthUser.AccountInfo;


/**
 * The provider for all fireauth.AuthUser objects is 'firebase'.
 */
fireauth.object.setReadonlyProperty(fireauth.AuthUser.prototype, 'providerId',
    fireauth.idp.ProviderId.FIREBASE);


/**
 * Returns nothing. This can be used to consume the output of a Promise.
 * @private
 */
fireauth.AuthUser.returnNothing_ = function() {
  // Return nothing. Intentionally left empty.
};


/**
 * Ensures the user is still logged in before moving to the next promise
 * resolution.
 * @return {!goog.Promise<undefined,undefined>}
 * @private
 */
fireauth.AuthUser.prototype.checkDestroyed_ = function() {
  var self = this;
  return goog.Promise.resolve().then(function() {
    if (self.destroyed_) {
      throw new fireauth.AuthError(fireauth.authenum.Error.MODULE_DESTROYED);
    }
  });
};


/**
 * @return {!Array<!fireauth.idp.ProviderId>} The list of provider IDs.
 */
fireauth.AuthUser.prototype.getProviderIds = function() {
  return goog.array.map(this['providerData'], function(userInfo) {
    return userInfo['providerId'];
  });
};


/**
 * Adds the provided user info to list of providers' data.
 * @param {?fireauth.AuthUserInfo} providerData Provider data to store for user.
 */
fireauth.AuthUser.prototype.addProviderData = function(providerData) {
  if (!providerData) {
    return;
  }
  this.removeProviderData(providerData['providerId']);
  this['providerData'].push(providerData);
};


/**
 * @param {!fireauth.idp.ProviderId} providerId The provider ID whose
 *     data should be removed.
 */
fireauth.AuthUser.prototype.removeProviderData = function(providerId) {
  goog.array.removeAllIf(this['providerData'], function(userInfo) {
    return userInfo['providerId'] == providerId;
  });
};


/**
 * @param {string} propName The property name to modify.
 * @param {?string|boolean} value The new value to set.
 */
fireauth.AuthUser.prototype.updateProperty = function(propName, value) {
  // User ID is required.
  if (propName == 'uid' && !value) {
    return;
  }
  if (this.hasOwnProperty(propName)) {
    fireauth.object.setReadonlyProperty(this, propName, value);
  }
};


/**
 * @param {!fireauth.AuthUser} otherUser The other user to compare to.
 * @return {boolean} True if both User objects have the same user ID.
 */
fireauth.AuthUser.prototype.hasSameUserIdAs = function(otherUser) {
  var thisId = this['uid'];
  var thatId = otherUser['uid'];
  if (thisId === undefined || thisId === null || thisId === '' ||
      thatId === undefined || thatId === null || thatId === '') {
    return false;
  }
  return thisId == thatId;
};


/**
 * Copies all properties and STS token manager instance from userToCopy to
 * current user without triggering any Auth state change or token change
 * listener.
 * @param {!fireauth.AuthUser} userToCopy The updated user to overwrite current
 *     user.
 */
fireauth.AuthUser.prototype.copy = function(userToCopy) {
  var self = this;
  // Copy to self.
  if (self == userToCopy) {
    return;
  }
  fireauth.object.setReadonlyProperties(this, {
    'uid': userToCopy['uid'],
    'displayName': userToCopy['displayName'],
    'photoURL': userToCopy['photoURL'],
    'email': userToCopy['email'],
    'emailVerified': userToCopy['emailVerified'],
    'phoneNumber': userToCopy['phoneNumber'],
    'isAnonymous': userToCopy['isAnonymous'],
    'tenantId': userToCopy['tenantId'],
    'providerData': []
  });
  // This should always be available but just in case there is a conflict with
  // a user from an older version.
  if (userToCopy['metadata']) {
    fireauth.object.setReadonlyProperty(
        this,
        'metadata',
        /** @type{!fireauth.UserMetadata} */ (userToCopy['metadata']).clone());
  } else {
    // User to copy has no metadata. Align with that.
    fireauth.object.setReadonlyProperty(
        this, 'metadata', new fireauth.UserMetadata());
  }
  goog.array.forEach(userToCopy['providerData'], function(userInfo) {
    self.addProviderData(userInfo);
  });
  this.stsTokenManager_.copy(userToCopy.getStsTokenManager());
  fireauth.object.setReadonlyProperty(
      this, 'refreshToken', this.stsTokenManager_.getRefreshToken());
  // Copy multi-factor info to current user.
  // This should be backward compatible.
  // If the userToCopy is loaded from an older version, multiFactorUser
  // enrolled factors will be initialized empty and copied empty to current
  // multiFactorUser.
  this.multiFactorUser_.copy(userToCopy.multiFactorUser_);
};


/**
 * Set the Auth user redirect storage manager.
 * @param {?fireauth.storage.RedirectUserManager} redirectStorageManager The
 *     utility used to store or delete the user on redirect.
 */
fireauth.AuthUser.prototype.setRedirectStorageManager =
    function(redirectStorageManager) {
  /**
   * @private {?fireauth.storage.RedirectUserManager} The redirect user storage
   *     manager.
   */
  this.redirectStorageManager_ = redirectStorageManager;
};


/**
 * Refreshes the current user, if signed in.
 * @return {!goog.Promise<void>}
 */
fireauth.AuthUser.prototype.reload = function() {
  var self = this;
  // Register this pending promise. This will also check for user invalidation.
  return this.registerPendingPromise_(this.checkDestroyed_().then(function() {
    return self.reloadWithoutSaving_()
        .then(function() {
          return self.notifyStateChangeListeners_();
        })
        .then(fireauth.AuthUser.returnNothing_);
  }));
};


/**
 * Refreshes the current user, if signed in.
 * @return {!goog.Promise<string>} Promise that resolves with the idToken.
 * @private
 */
fireauth.AuthUser.prototype.reloadWithoutSaving_ = function() {
  var self = this;
  // ID token is required to refresh the user's data.
  // If this is called after invalidation, getToken will throw the cached error.
  return this.getIdToken().then(function(idToken) {
    var isAnonymous = self['isAnonymous'];
    return self.setUserAccountInfoFromToken_(idToken)
        .then(function(user) {
          if (!isAnonymous) {
            // Preserves the not anonymous status of the stored user,
            // even if no more credentials (federated or email/password)
            // linked to the user.
            self.updateProperty('isAnonymous', false);
          }
          return idToken;
        });
  });
};


/**
 * This operation resolves with the Firebase ID token result which contains
 * the entire payload claims.
 * @param {boolean=} opt_forceRefresh Whether to force refresh token exchange.
 * @return {!goog.Promise<!fireauth.IdTokenResult>} A Promise that resolves with
 *     the ID token result.
 */
fireauth.AuthUser.prototype.getIdTokenResult = function(opt_forceRefresh) {
  return this.getIdToken(opt_forceRefresh).then(function(idToken) {
    return new fireauth.IdTokenResult(idToken);
  });
};


/**
 * This operation resolves with the Firebase ID token.
 * @param {boolean=} opt_forceRefresh Whether to force refresh token exchange.
 * @return {!goog.Promise<string>} A Promise that resolves with the ID token.
 */
fireauth.AuthUser.prototype.getIdToken = function(opt_forceRefresh) {
  var self = this;
  // Register this pending promise. This will also check for user invalidation.
  return this.registerPendingPromise_(this.checkDestroyed_().then(function() {
    return self.stsTokenManager_.getToken(opt_forceRefresh);
  }).then(function(response) {
    if (!response) {
      // If the user exists, the token manager should be initialized.
      throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
    }
    // Only if the access token is refreshed, notify Auth listeners.
    if (response['accessToken'] != self.lastAccessToken_) {
      self.setLastAccessToken_(response['accessToken']);
      // Auth state change, notify listeners.
      self.notifyAuthListeners_();
    }
    self.updateProperty('refreshToken', response['refreshToken']);
    return response['accessToken'];
  }));
};


/**
 * Checks if the error corresponds to a user invalidation action.
 * @param {*} error The error returned by a user operation.
 * @return {boolean} Whether the user is invalidated based on the error
 *     provided.
 * @private
 */
fireauth.AuthUser.isUserInvalidated_ = function(error) {
  return !!(error &&
      (error.code == 'auth/user-disabled' ||
       error.code == 'auth/user-token-expired'));
};


/**
 * Updates the current tokens using a server response, if new tokens are
 * present and are different from the current ones, and notify the Auth
 * listeners.
 * @param {!Object} response The response from the server.
 */
fireauth.AuthUser.prototype.updateTokensIfPresent = function(response) {
  if (response[fireauth.RpcHandler.AuthServerField.ID_TOKEN] &&
      this.lastAccessToken_ != response[
          fireauth.RpcHandler.AuthServerField.ID_TOKEN]) {
    this.stsTokenManager_.parseServerResponse(response);
    this.notifyAuthListeners_();
    this.setLastAccessToken_(response[
        fireauth.RpcHandler.AuthServerField.ID_TOKEN]);
    // Update refresh token property.
    this.updateProperty(
        'refreshToken', this.stsTokenManager_.getRefreshToken());
  }
};


/**
 * Called internally on Auth (access token) changes to notify listeners.
 * @private
 */
fireauth.AuthUser.prototype.notifyAuthListeners_ = function() {
  this.dispatchEvent(
      new fireauth.UserEvent(fireauth.UserEventType.TOKEN_CHANGED));
};


/**
 * Called internally on user deletion to notify listeners.
 * @private
 */
fireauth.AuthUser.prototype.notifyUserDeletedListeners_ = function() {
  this.dispatchEvent(
      new fireauth.UserEvent(fireauth.UserEventType.USER_DELETED));
};


/**
 * Called internally on user session invalidation to notify listeners.
 * @private
 */
fireauth.AuthUser.prototype.notifyUserInvalidatedListeners_ = function() {
  this.dispatchEvent(
      new fireauth.UserEvent(fireauth.UserEventType.USER_INVALIDATED));
};


/**
 * Queries the backend using the provided ID token for all linked accounts to
 * build the Firebase user object.
 * @param {string} idToken The ID token string.
 * @return {!goog.Promise<undefined>}
 * @private
 */
fireauth.AuthUser.prototype.setUserAccountInfoFromToken_ = function (idToken) {
  return this.rpcHandler_.getAccountInfoByIdToken(idToken)
      .then(goog.bind(this.parseAccountInfo_, this));
};


/**
 * Parses the response from the getAccountInfo endpoint.
 * @param {!Object} resp The backend response.
 * @private
 */
fireauth.AuthUser.prototype.parseAccountInfo_ = function(resp) {
  var users = resp[fireauth.AuthUser.GET_ACCOUNT_INFO_USERS];
  if (!users || !users.length) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
  var user = users[0];
  var accountInfo = /** @type {!fireauth.AuthUser.AccountInfo} */ ({
    'uid': /** @type {string} */ (
        user[fireauth.AuthUser.GetAccountInfoField.LOCAL_ID]),
    'displayName': /** @type {?string|undefined} */ (
        user[fireauth.AuthUser.GetAccountInfoField.DISPLAY_NAME]),
    'photoURL': /** @type {?string|undefined} */ (
        user[fireauth.AuthUser.GetAccountInfoField.PHOTO_URL]),
    'email': /** @type {?string|undefined} */ (
        user[fireauth.AuthUser.GetAccountInfoField.EMAIL]),
    'emailVerified':
        !!user[fireauth.AuthUser.GetAccountInfoField.EMAIL_VERIFIED],
    'phoneNumber': /** @type {?string|undefined} */ (
        user[fireauth.AuthUser.GetAccountInfoField.PHONE_NUMBER]),
    'lastLoginAt': /** @type {?string|undefined} */ (
        user[fireauth.AuthUser.GetAccountInfoField.LAST_LOGIN_AT]),
    'createdAt': /** @type {?string|undefined} */ (
        user[fireauth.AuthUser.GetAccountInfoField.CREATED_AT]),
    'tenantId': /** @type {?string|undefined} */ (
        user[fireauth.AuthUser.GetAccountInfoField.TENANT_ID])
  });
  this.setAccountInfo(accountInfo);
  var linkedAccounts = this.extractLinkedAccounts_(user);
  for (var i = 0; i < linkedAccounts.length; i++) {
    this.addProviderData(linkedAccounts[i]);
  }
  // Sets the isAnonymous flag based on email, passwordHash and providerData.
  var isAnonymous = !(this['email'] &&
      user[fireauth.AuthUser.GetAccountInfoField.PASSWORD_HASH]) &&
      !(this['providerData'] && this['providerData'].length);
  this.updateProperty('isAnonymous', isAnonymous);
  // Notify external listeners of the reload.
  this.dispatchEvent(new fireauth.UserEvent(
      fireauth.UserEventType.USER_RELOADED,
      {userServerResponse: user}));
};


/**
 * Extracts the linked accounts from getAccountInfo response and returns an
 * array of corresponding provider data.
 * @param {!Object} resp The response object.
 * @return {!Array<!fireauth.AuthUserInfo>} The linked accounts.
 * @private
 */
fireauth.AuthUser.prototype.extractLinkedAccounts_ = function(resp) {
  var providerInfo =
      resp[fireauth.AuthUser.GetAccountInfoField.PROVIDER_USER_INFO];
  if (!providerInfo || !providerInfo.length) {
    return [];
  }

  return goog.array.map(providerInfo, function(info) {
    return new fireauth.AuthUserInfo(
        info[fireauth.AuthUser.GetAccountInfoProviderField.RAW_ID],
        info[fireauth.AuthUser.GetAccountInfoProviderField.PROVIDER_ID],
        info[fireauth.AuthUser.GetAccountInfoProviderField.EMAIL],
        info[fireauth.AuthUser.GetAccountInfoProviderField.DISPLAY_NAME],
        info[fireauth.AuthUser.GetAccountInfoProviderField.PHOTO_URL],
        info[fireauth.AuthUser.GetAccountInfoProviderField.PHONE_NUMBER]);
  });
};


/**
 * Reauthenticates a user using a fresh credential, to be used before operations
 * such as updatePassword that require tokens from recent login attempts. It
 * also returns any additional user info data or credentials returned form the
 * backend. It has been deprecated in favor of reauthenticateWithCredential.
 * @param {!fireauth.AuthCredential} credential
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.AuthUser.prototype.reauthenticateAndRetrieveDataWithCredential =
    function(credential) {
  fireauth.deprecation.log(
      fireauth.deprecation.Deprecations.REAUTH_WITH_CREDENTIAL);
  return this.reauthenticateWithCredential(credential);
};


/**
 * Reauthenticates a user using a fresh credential, to be used before operations
 * such as updatePassword that require tokens from recent login attempts. It
 * also returns any additional user info data or credentials returned form the
 * backend.
 * @param {!fireauth.AuthCredential} credential
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.AuthUser.prototype.reauthenticateWithCredential =
    function(credential) {
  var self = this;
  var userCredential = null;
  // Register this pending promise but bypass user invalidation check.
  return this.registerPendingPromise_(
      // Match ID token from credential with the current user UID.
      credential.matchIdTokenWithUid(this.rpcHandler_, this['uid'])
      .then(function(response) {
        // If the credential is valid and matches the current user ID, then
        // update the tokens accordingly.
        self.updateTokensIfPresent(response);
        // Get user credential.
        userCredential = self.getUserCredential_(
            response, fireauth.constants.OperationType.REAUTHENTICATE);
        // This could potentially validate an invalidated user. This happens in
        // the case a password reset was applied. The refresh token is expired.
        // Reauthentication should revalidate the user.
        // User would remain non current if already signed out, but should be
        // enabled again.
        self.userInvalidatedError_ = null;
        return self.reload();
      }).then(function() {
        // Return user credential after reauthenticated user is reloaded.
        return userCredential;
      }),
      // Skip invalidation check as reauthentication could revalidate a user.
      true);
};


/**
 * Reloads the user and then checks if a provider is already linked. If so,
 * this returns a Promise that rejects. Note that state change listeners are not
 * notified on success, so that operations using this can make changes and then
 * do one final listener notification.
 * @param {string} providerId
 * @return {!goog.Promise<void>}
 * @private
 */
fireauth.AuthUser.prototype.checkIfAlreadyLinked_ =
    function(providerId) {
  var self = this;
  // Reload first in case the user was updated elsewhere.
  return this.reloadWithoutSaving_()
      .then(function() {
        if (goog.array.contains(self.getProviderIds(), providerId)) {
          return self.notifyStateChangeListeners_()
              .then(function() {
                  throw new fireauth.AuthError(
                      fireauth.authenum.Error.PROVIDER_ALREADY_LINKED);
              });
        }
      });
};


/**
 * Links a provider to the current user and returns any additional user info
 * data or credentials returned form the backend. It has been deprecated in
 * favor of linkWithCredential.
 * @param {!fireauth.AuthCredential} credential The credential from the Auth
 *     provider.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.AuthUser.prototype.linkAndRetrieveDataWithCredential =
    function(credential) {
  fireauth.deprecation.log(
      fireauth.deprecation.Deprecations.LINK_WITH_CREDENTIAL);
  return this.linkWithCredential(credential);
};


/**
 * Links a provider to the current user and returns any additional user info
 * data or credentials returned form the backend.
 * @param {!fireauth.AuthCredential} credential The credential from the Auth
 *     provider.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.AuthUser.prototype.linkWithCredential = function(credential) {
  var self = this;
  var userCredential = null;
  // Register this pending promise. This will also check for user invalidation.
  return this.registerPendingPromise_(
      this.checkIfAlreadyLinked_(credential['providerId'])
      .then(function() {
        return self.getIdToken();
      })
      .then(function(idToken) {
        return credential.linkToIdToken(self.rpcHandler_, idToken);
      })
      .then(function(response) {
        // Get user credential.
        userCredential = self.getUserCredential_(
            response, fireauth.constants.OperationType.LINK);
        // Finalize linking.
        return self.finalizeLinking_(response);
      })
      .then(function(user) {
        // Return user credential after finalizing linking.
        return userCredential;
      })
  );
};


/**
 * Links a phone number using the App verifier instance and returns a
 * promise that resolves with the confirmation result which on confirmation
 * will resolve with the UserCredential object.
 * @param {string} phoneNumber The phone number to authenticate with.
 * @param {!firebase.auth.ApplicationVerifier} appVerifier The application
 *     verifier.
 * @return {!goog.Promise<!fireauth.ConfirmationResult>}
 */
fireauth.AuthUser.prototype.linkWithPhoneNumber =
    function(phoneNumber, appVerifier) {
  var self = this;
  return /** @type {!goog.Promise<!fireauth.ConfirmationResult>} */ (
      this.registerPendingPromise_(
          // Check if linked already. If so, throw an error.
          // This is redundant but is needed to prevent the need to send the
          // SMS (worth the cost).
          this.checkIfAlreadyLinked_(fireauth.idp.ProviderId.PHONE)
              .then(function() {
                return fireauth.ConfirmationResult.initialize(
                    self.getAuth_(),
                    phoneNumber,
                    appVerifier,
                    // This will check again if the credential is linked.
                    goog.bind(self.linkWithCredential, self));
              })));
};


/**
 * Reauthenticates a user with a phone number using the App verifier instance
 * and returns a promise that resolves with the confirmation result which on
 * confirmation will resolve with the UserCredential object.
 * @param {string} phoneNumber The phone number to authenticate with.
 * @param {!firebase.auth.ApplicationVerifier} appVerifier The application
 *     verifier.
 * @return {!goog.Promise<!fireauth.ConfirmationResult>}
 */
fireauth.AuthUser.prototype.reauthenticateWithPhoneNumber =
    function(phoneNumber, appVerifier) {
  var self = this;
  return /** @type {!goog.Promise<!fireauth.ConfirmationResult>} */ (
      this.registerPendingPromise_(
          // Wrap this operation in a Promise since self.getAuth_() may throw an
          // error synchronously.
          goog.Promise.resolve().then(function() {
            return fireauth.ConfirmationResult.initialize(
                // Get corresponding Auth instance.
                self.getAuth_(),
                phoneNumber,
                appVerifier,
                goog.bind(self.reauthenticateWithCredential,
                    self));
          }),
          // Skip invalidation check as reauthentication could revalidate a
          // user.
          true));
};


/**
 * Converts an ID token response (eg. verifyAssertion) to a UserCredential
 * object.
 * @param {!Object} idTokenResponse The ID token response.
 * @param {!fireauth.constants.OperationType} operationType The operation type
 *     to set in the user credential.
 * @return {!fireauth.AuthEventManager.Result} The UserCredential object
 *     constructed from the response.
 * @private
 */
fireauth.AuthUser.prototype.getUserCredential_ =
    function(idTokenResponse, operationType) {
  // Get credential if available in the response.
  var credential = fireauth.AuthProvider.getCredentialFromResponse(
      idTokenResponse);
  // Get additional user info data if available in the response.
  var additionalUserInfo = fireauth.AdditionalUserInfo.fromPlainObject(
      idTokenResponse);
  // Return the readonly copy of the user credential object.
  return fireauth.object.makeReadonlyCopy({
    // Return the current user reference.
    'user': this,
    // Return any credential passed from the backend.
    'credential': credential,
    // Return any additional IdP data passed from the backend.
    'additionalUserInfo': additionalUserInfo,
    // Return the operation type in the user credential object.
    'operationType': operationType
  });
};


/**
 * Finalizes a linking flow, updating idToken and user's data using the
 * RPC linking response.
 * @param {!Object} response The RPC linking response.
 * @return {!goog.Promise<!fireauth.AuthUser>}
 * @private
 */
fireauth.AuthUser.prototype.finalizeLinking_ = function(response) {
  // The response may contain a new access token,
  // so we should update them just like a new sign in.
  this.updateTokensIfPresent(response);
  // This will take care of saving the updated state.
  var self = this;
  return this.reload().then(function() {
    return self;
  });
};


/**
 * Updates the user's email.
 * @param {string} newEmail The new email.
 * @return {!goog.Promise<void>}
 */
fireauth.AuthUser.prototype.updateEmail = function(newEmail) {
  var self = this;
  // Register this pending promise. This will also check for user invalidation.
  return this.registerPendingPromise_(this.getIdToken()
      .then(function(idToken) {
        return self.rpcHandler_.updateEmail(idToken, newEmail);
      })
      .then(function(response) {
        // Calls to SetAccountInfo may invalidate old tokens.
        self.updateTokensIfPresent(response);
        // Reloads the user to update emailVerified.
        return self.reload();
      }));
};


/**
 * Updates the user's phone number.
 * @param {!fireauth.PhoneAuthCredential} phoneCredential
 * @return {!goog.Promise<void>}
 */
fireauth.AuthUser.prototype.updatePhoneNumber = function(phoneCredential) {
  var self = this;
  return this.registerPendingPromise_(this.getIdToken()
      .then(function(idToken) {
        // The backend always overwrites the existing phone number during a
        // link operation.
        return phoneCredential.linkToIdToken(self.rpcHandler_, idToken);
      })
      .then(function(response) {
        self.updateTokensIfPresent(response);
        return self.reload();
      }));
};


/**
 * Updates the user's password.
 * @param {string} newPassword The new password.
 * @return {!goog.Promise<void>}
 */
fireauth.AuthUser.prototype.updatePassword = function(newPassword) {
  var self = this;
  // Register this pending promise. This will also check for user invalidation.
  return this.registerPendingPromise_(
      this.getIdToken()
      .then(function(idToken) {
        return self.rpcHandler_.updatePassword(idToken, newPassword);
      })
      .then(function(response) {
        self.updateTokensIfPresent(response);
        // Reloads the user in case email has also been updated and the user
        // was anonymous.
        return self.reload();
      }));
};


/**
 * Updates the user's profile data.
 * @param {!Object} profile The profile data to update.
 * @return {!goog.Promise<undefined>}
 */
fireauth.AuthUser.prototype.updateProfile = function(profile) {
  if (profile['displayName'] === undefined &&
      profile['photoURL'] === undefined) {
    // No change, directly return.
    return this.checkDestroyed_();
  }
  var self = this;
  // Register this pending promise. This will also check for user invalidation.
  return this.registerPendingPromise_(
      this.getIdToken().then(function(idToken) {
        // Translate the request into one that the backend accepts.
        var profileRequest = {
          'displayName': profile['displayName'],
          'photoUrl': profile['photoURL']
        };
        return self.rpcHandler_.updateProfile(idToken, profileRequest);
      })
      .then(function(response) {
        // Calls to SetAccountInfo may invalidate old tokens.
        self.updateTokensIfPresent(response);
        // Update properties.
        self.updateProperty('displayName',
            response[fireauth.AuthUser.SetAccountInfoField.DISPLAY_NAME] ||
            null);
        self.updateProperty('photoURL',
            response[fireauth.AuthUser.SetAccountInfoField.PHOTO_URL] || null);
        goog.array.forEach(self['providerData'], function(userInfo) {
          // Check if password provider is linked.
          if (userInfo['providerId'] === fireauth.idp.ProviderId.PASSWORD) {
            // If so, update both fields in that provider.
            fireauth.object.setReadonlyProperty(
                userInfo, 'displayName', self['displayName']);
            fireauth.object.setReadonlyProperty(
                userInfo, 'photoURL', self['photoURL']);
          }
        });
        // Notify changes and resolve.
        return self.notifyStateChangeListeners_();
      })
      .then(fireauth.AuthUser.returnNothing_));
};


/**
 * Unlinks a provider from an account.
 * @param {!fireauth.idp.ProviderId} providerId The ID of the provider to
 *     unlink.
 * @return {!goog.Promise<!fireauth.AuthUser>}
 */
fireauth.AuthUser.prototype.unlink = function(providerId) {
  var self = this;
  // Make sure we have updated user providers to avoid removing a linked
  // provider that hasn't been updated in current copy of user.
  // Register this pending promise. This will also check for user invalidation.
  return this.registerPendingPromise_(
      this.reloadWithoutSaving_()
      .then(function(idToken) {
        // Provider already unlinked.
        if (!goog.array.contains(self.getProviderIds(), providerId)) {
          return self.notifyStateChangeListeners_()
              .then(function() {
                throw new fireauth.AuthError(
                    fireauth.authenum.Error.NO_SUCH_PROVIDER);
              });
        }
        // We delete the providerId given.
        return self.rpcHandler_
            .deleteLinkedAccounts(idToken, [providerId])
            .then(function(resp) {
              // Construct the set of provider IDs returned by server.
              var remainingProviderIds = {};
              var userInfo = resp[fireauth.AuthUser.SetAccountInfoField.
                  PROVIDER_USER_INFO] || [];
              goog.array.forEach(userInfo, function(obj) {
                remainingProviderIds[
                    obj[fireauth.AuthUser.SetAccountInfoField.PROVIDER_ID]] =
                    true;
              });

              // Remove all provider data objects where the provider ID no
              // longer exists in this user.
              goog.array.forEach(self.getProviderIds(), function(pId) {
                if (!remainingProviderIds[pId]) {
                  // This provider no longer linked, remove it from user.
                  self.removeProviderData(pId);
                }
              });

              // Remove the phone number if the phone provider was unlinked.
              if (!remainingProviderIds[fireauth.PhoneAuthProvider[
                      'PROVIDER_ID']]) {
                fireauth.object.setReadonlyProperty(self, 'phoneNumber', null);
              }

              return self.notifyStateChangeListeners_();
            });
      }));
};


/**
 * Deletes the user, triggering an Auth token change if successful.
 * @return {!goog.Promise<void>}
 */
fireauth.AuthUser.prototype.delete = function() {
  // Notice the way of declaring the method, it's to avoid a weird bug on IE8.
  var self = this;
  // Register this pending promise. This will also check for user invalidation.
  return this.registerPendingPromise_(
      this.getIdToken()
      .then(function(idToken) {
        return self.rpcHandler_.deleteAccount(idToken);
      })
      .then(function() {
        self.notifyUserDeletedListeners_();
      }))
      .then(function() {
        // Destroying after the registered promise is handled ensures it won't
        // be canceled.
        self.destroy();
      });
};


/**
 * Tells the Auth event manager if this user is the owner of a detected Auth
 * event. A user can handle linkWithPopup and linkWithRedirect operations.
 * In addition, the event ID should match the user's event IDs.
 * @param {!fireauth.AuthEvent.Type} mode The Auth operation mode (popup,
 *     redirect).
 * @param {?string=} opt_eventId The event ID.
 * @return {boolean} Whether the Auth event handler can handler the provided
 *     event.
 * @override
 */
fireauth.AuthUser.prototype.canHandleAuthEvent = function(mode, opt_eventId) {
  if (mode == fireauth.AuthEvent.Type.LINK_VIA_POPUP &&
      this.getPopupEventId() == opt_eventId &&
      this.pendingPopupResolvePromise_) {
    // The link via popup event's ID matches the user's popup event ID which
    // makes this user the owner of this event.
    return true;
  } else if (mode == fireauth.AuthEvent.Type.REAUTH_VIA_POPUP &&
      this.getPopupEventId() == opt_eventId &&
      this.pendingPopupResolvePromise_) {
    // The reauth via popup event's ID matches the user's popup event ID which
    // makes this user the owner of this event.
    return true;
  } else if (mode == fireauth.AuthEvent.Type.LINK_VIA_REDIRECT &&
             this.getRedirectEventId() == opt_eventId) {
    // The link via redirect event's ID matches the user's redirect event ID
    // which makes this user the owner of this event.
    return true;
  } else if (mode == fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT &&
             this.getRedirectEventId() == opt_eventId) {
    // The reauth via redirect event's ID matches the user's redirect event ID
    // which makes this user the owner of this event.
    return true;
  }
  return false;
};


/**
 * Completes the pending popup operation. If error is not null, rejects with the
 * error. Otherwise, it resolves with the popup redirect result.
 * @param {!fireauth.AuthEvent.Type} mode The Auth operation mode (popup,
 *     redirect).
 * @param {?fireauth.AuthEventManager.Result} popupRedirectResult The result
 *     to resolve with when no error supplied.
 * @param {?fireauth.AuthError} error When supplied, the promise will reject.
 * @param {?string=} opt_eventId The event ID.
 * @override
 */
fireauth.AuthUser.prototype.resolvePendingPopupEvent =
    function(mode, popupRedirectResult, error, opt_eventId) {
  // Only handles popup events with event IDs that match a pending popup ID.
  if ((mode != fireauth.AuthEvent.Type.LINK_VIA_POPUP &&
       mode != fireauth.AuthEvent.Type.REAUTH_VIA_POPUP) ||
      opt_eventId != this.getPopupEventId()) {
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
  // Now that event is resolved, delete timeout promise.
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
 * finisher. Can handle link or reauth events that match existing event IDs.
 * @param {!fireauth.AuthEvent.Type} mode The Auth operation mode (popup,
 *     redirect).
 * @param {?string=} opt_eventId The optional event ID.
 * @return {?function(string, string, ?string,
 *     ?string=):!goog.Promise<!fireauth.AuthEventManager.Result>}
 * @override
 */
fireauth.AuthUser.prototype.getAuthEventHandlerFinisher =
    function(mode, opt_eventId) {
  if (mode == fireauth.AuthEvent.Type.LINK_VIA_POPUP &&
      opt_eventId == this.getPopupEventId()) {
    // Link with popup ID matches popup event ID.
    return goog.bind(this.finishPopupAndRedirectLink, this);
  } else if (mode == fireauth.AuthEvent.Type.REAUTH_VIA_POPUP &&
      opt_eventId == this.getPopupEventId()) {
    // Reauth with popup ID matches popup event ID.
    return goog.bind(this.finishPopupAndRedirectReauth, this);
  } else if (mode == fireauth.AuthEvent.Type.LINK_VIA_REDIRECT &&
             this.getRedirectEventId() == opt_eventId) {
    // Link with redirect ID matches redirect event ID.
    return goog.bind(this.finishPopupAndRedirectLink, this);
  } else if (mode == fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT &&
             this.getRedirectEventId() == opt_eventId) {
    // Reauth with redirect ID matches redirect event ID.
    return goog.bind(this.finishPopupAndRedirectReauth, this);
  }
  return null;
};


/**
 * @return {string} The generated event ID used to identify a popup or redirect
 *     event.
 * @private
 */
fireauth.AuthUser.prototype.generateEventId_ = function() {
  return fireauth.util.generateEventId(this['uid'] + ':::');
};


/**
 * Links to Auth provider via popup.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.AuthUser.prototype.linkWithPopup = function(provider) {
  var self = this;
  // Additional check to return to fail when the provider is already linked.
  var additionalCheck = function() {
    return self.checkIfAlreadyLinked_(provider['providerId'])
        .then(function() {
          // Notify state listeners after the check as it will update the user
          // state.
          return self.notifyStateChangeListeners_();
        });
  };
  return this.runOperationWithPopup_(
      fireauth.AuthEvent.Type.LINK_VIA_POPUP, provider, additionalCheck, false);
};


/**
 * Reauthenticate to Auth provider via popup.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.AuthUser.prototype.reauthenticateWithPopup = function(provider) {
  // No additional check needed before running this operation.
  var additionalCheck = function() {
    return goog.Promise.resolve();
  };
  return this.runOperationWithPopup_(
      fireauth.AuthEvent.Type.REAUTH_VIA_POPUP,
      provider,
      additionalCheck,
      // Do not update token and skip session invalidation check.
      true);
};


/**
 * Runs a specific OAuth operation using the Auth provider via popup.
 * @param {!fireauth.AuthEvent.Type} mode The mode of operation (link or
 *     reauth).
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @param {function():!goog.Promise} additionalCheck The additional check to
 *     run before proceeding with the popup processing.
 * @param {boolean} isReauthOperation whether this is a reauth operation or not.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 * @private
 */
fireauth.AuthUser.prototype.runOperationWithPopup_ =
    function(mode, provider, additionalCheck, isReauthOperation) {
  // Check if popup and redirect are supported in this environment.
  if (!fireauth.util.isPopupRedirectSupported()) {
    return goog.Promise.reject(new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED));
  }
  // Quickly throw user invalidation error if already invalidated.
  if (this.userInvalidatedError_ &&
      // Skip invalidation check as reauthentication could revalidate a user.
      !isReauthOperation) {
    return goog.Promise.reject(this.userInvalidatedError_);
  }
  var self = this;
  // Popup the window immediately to make sure the browser associates the
  // popup with the click that triggered it.

  // Get provider settings.
  var settings = fireauth.idp.getIdpSettings(provider['providerId']);
  // There could multiple users at the same time and multiple users could have
  // the same UID. So try to ensure event ID uniqueness.
  var eventId = this.generateEventId_();
  // If incapable of redirecting popup from opener, popup destination URL
  // directly. This could also happen in a sandboxed iframe.
  var oauthHelperWidgetUrl = null;
  if ((!fireauth.util.runsInBackground() || fireauth.util.isIframe()) &&
      this.authDomain_ &&
      provider['isOAuthProvider']) {
    oauthHelperWidgetUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            this.authDomain_,
            this.apiKey_,
            this.appName_,
            mode,
            provider,
            null,
            eventId,
            firebase.SDK_VERSION || null,
            null,
            null,
            this['tenantId']);
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
  var p = additionalCheck().then(function() {
    // Auth event manager must be available for account linking or
    // reauthentication to be possible.
    self.getAuthEventManager();
    if (!isReauthOperation) {
      // Some operations like reauthenticate do not require this.
      return self.getIdToken().then(function(idToken) {});
    }
  }).then(function() {
    // Process popup request.
    return self.authEventManager_.processPopup(
        popupWin, mode, provider, eventId, !!oauthHelperWidgetUrl,
        self['tenantId']);
  }).then(function() {
    return new goog.Promise(function(resolve, reject) {
      // Expire other pending promises if still available.
      self.resolvePendingPopupEvent(
          mode,
          null,
          new fireauth.AuthError(fireauth.authenum.Error.EXPIRED_POPUP_REQUEST),
          // Existing popup event ID.
          self.getPopupEventId());
      // Save current pending promises.
      self.pendingPopupResolvePromise_ = resolve;
      self.pendingPopupRejectPromise_ = reject;
      // Overwrite popup event ID with new one.
      self.setPopupEventId(eventId);
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
  // Register this pending promise. This will also check for user invalidation.
  return /** @type {!goog.Promise<!fireauth.AuthEventManager.Result>} */ (
      this.registerPendingPromise_(
          p,
          // Skip invalidation check as reauthentication could revalidate a
          // user.
          isReauthOperation));
};


/**
 * Links to Auth provider via redirect.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @return {!goog.Promise<void>}
 */
fireauth.AuthUser.prototype.linkWithRedirect = function(provider) {
  var mode = fireauth.AuthEvent.Type.LINK_VIA_REDIRECT;
  var self = this;
  // Additional check to return to fail when the provider is already linked.
  var additionalCheck = function() {
    return self.checkIfAlreadyLinked_(provider['providerId']);
  };
  return this.runOperationWithRedirect_(mode, provider, additionalCheck, false);
};


/**
 * Reauthenticates to Auth provider via redirect.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @return {!goog.Promise<void>}
 */
fireauth.AuthUser.prototype.reauthenticateWithRedirect = function(provider) {
  // No additional check needed.
  var additionalCheck = function() {
    return goog.Promise.resolve();
  };
  return this.runOperationWithRedirect_(
      fireauth.AuthEvent.Type.REAUTH_VIA_REDIRECT,
      provider,
      additionalCheck,
      // Do not update token and skip session invalidation check.
      true);
};



/**
 * Runs a specific OAuth operation using the Auth provider via redirect.
 * @param {!fireauth.AuthEvent.Type} mode The mode of operation (link or
 *     reauth).
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @param {function():!goog.Promise} additionalCheck The additional check to
 *     run before proceeding with the redirect processing.
 * @param {boolean} isReauthOperation whether this is a reauth operation or not.
 * @return {!goog.Promise<void>}
 * @private
 */
fireauth.AuthUser.prototype.runOperationWithRedirect_ =
    function(mode, provider, additionalCheck, isReauthOperation) {
  // Check if popup and redirect are supported in this environment.
  if (!fireauth.util.isPopupRedirectSupported()) {
    return goog.Promise.reject(new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED));
  }
  // Quickly throw user invalidation error if already invalidated.
  if (this.userInvalidatedError_ &&
      // Skip invalidation check as reauthentication could revalidate a user.
      !isReauthOperation) {
    return goog.Promise.reject(this.userInvalidatedError_);
  }
  var self = this;
  var errorThrown = null;
  // There could multiple users at the same time and multiple users could have
  // the same UID. So try to ensure event ID uniqueness.
  var eventId = this.generateEventId_();
  var p = additionalCheck().then(function() {
    // Auth event manager must be available for account linking or
    // reauthentication to be possible.
    self.getAuthEventManager();
    if (!isReauthOperation) {
      // Some operations like reauthenticate do not require this.
      return self.getIdToken().then(function(idToken) {});
    }
  }).then(function() {
    // Process redirect operation.
    self.setRedirectEventId(eventId);
    // Before redirecting save the event ID.
    // It is important that the user redirect event ID is updated in storage
    // before redirecting.
    return self.notifyStateChangeListeners_();
  }).then(function(user) {
    if (self.redirectStorageManager_) {
      // Save the user before redirecting in case it is not current so that it
      // can be retrieved after reloading for linking or reauthentication to
      // succeed.
      return self.redirectStorageManager_.setRedirectUser(self);
    }
    return user;
  }).then(function(user) {
    // Complete the redirect operation.
    return self.authEventManager_.processRedirect(
        mode, provider, eventId, self['tenantId']);
  }).thenCatch(function(error) {
    // Catch error if any is generated.
    errorThrown = error;
    if (self.redirectStorageManager_) {
      // If an error is detected, delete the redirected user from storage.
      return self.redirectStorageManager_.removeRedirectUser();
    }
    // No storage manager, just throw error.
    throw errorThrown;
  }).then(function() {
    // Rethrow the error.
    if (errorThrown) {
      throw errorThrown;
    }
  });
  // Register this pending promise. This will also check for user invalidation.
  return /** @type {!goog.Promise<void>} */ (this.registerPendingPromise_(
      p,
      // Skip invalidation check as reauthentication could revalidate a user.
      isReauthOperation));
};


/**
 * @return {!fireauth.AuthEventManager} The user's Auth event manager.
 */
fireauth.AuthUser.prototype.getAuthEventManager = function() {
  // Either return the manager instance if available, otherwise throw an error.
  if (this.authEventManager_ && this.popupRedirectEnabled_) {
    return this.authEventManager_;
  } else if (this.authEventManager_ && !this.popupRedirectEnabled_) {
    // This should not happen as Auth will enable a user after it is created.
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
  throw new fireauth.AuthError(fireauth.authenum.Error.MISSING_AUTH_DOMAIN);
};


/**
 * Finishes the popup and redirect account linking operations.
 * @param {string} requestUri The callback URL with the OAuth response.
 * @param {string} sessionId The session ID used to generate the authUri.
 * @param {?string} tenantId The tenant ID.
 * @param {?string=} opt_postBody The optional POST body content.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.AuthUser.prototype.finishPopupAndRedirectLink =
    function(requestUri, sessionId, tenantId, opt_postBody) {
  var self = this;
  // Now that popup has responded, delete popup timeout promise.
  if (this.popupTimeoutPromise_) {
    this.popupTimeoutPromise_.cancel();
    this.popupTimeoutPromise_ = null;
  }
  var userCredential = null;
  // This routine could be run before init state, make sure it waits for that to
  // complete otherwise this would fail as user not loaded from storage yet.
  var p = this.getIdToken()
      .then(function(idToken) {
        var request = {
          'requestUri': requestUri,
          'postBody': opt_postBody,
          'sessionId': sessionId,
          // To link a tenant user, the tenant ID will be passed to the
          // backend as part of the ID token.
          'idToken': idToken
        };
        // This operation should fail if new ID token differs from old one.
        // So this can be treate as a profile update operation.
        return self.rpcHandler_.verifyAssertionForLinking(request);
      })
      .then(function(response) {
        // Get user credential.
        userCredential = self.getUserCredential_(
            response, fireauth.constants.OperationType.LINK);
        // Finalizes the linking process.
        return self.finalizeLinking_(response);
      })
      .then(function(user) {
        // Return the user credential response.
        return userCredential;
      });
  return /** @type {!goog.Promise<!fireauth.AuthEventManager.Result>} */ (
      this.registerPendingPromise_(p));
};


/**
 * Finishes the popup and redirect account reauthentication operations.
 * @param {string} requestUri The callback URL with the OAuth response.
 * @param {string} sessionId The session ID used to generate the authUri.
 * @param {?string} tenantId The tenant ID.
 * @param {?string=} opt_postBody The optional POST body content.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>}
 */
fireauth.AuthUser.prototype.finishPopupAndRedirectReauth =
    function(requestUri, sessionId, tenantId, opt_postBody) {
  var self = this;
  // Now that popup has responded, delete popup timeout promise.
  if (this.popupTimeoutPromise_) {
    this.popupTimeoutPromise_.cancel();
    this.popupTimeoutPromise_ = null;
  }
  var userCredential = null;
  // This routine could be run before init state, make sure it waits for that to
  // complete otherwise this would fail as user not loaded from storage yet.
  var p = goog.Promise.resolve()
      .then(function() {
        var request = {
          'requestUri': requestUri,
          'sessionId': sessionId,
          'postBody': opt_postBody,
          // To reauthenticate a tenant user, the tenant ID will be passed to
          // the backend explicitly.
          // Even if tenant ID is null, still pass it to RPC handler explicitly
          // so that it won't be overridden by RPC handler's tenant ID.
          'tenantId': tenantId
        };
        // Finish sign in by calling verifyAssertionForExisting and then
        // matching the returned ID token's UID with the current user's.
        return fireauth.AuthCredential.verifyTokenResponseUid(
            self.rpcHandler_.verifyAssertionForExisting(request),
            self['uid']);
      }).then(function(response) {
        // Get credential from response if available.
        // Get user credential.
        userCredential = self.getUserCredential_(
            response, fireauth.constants.OperationType.REAUTHENTICATE);
        // If the credential is valid and matches the current user ID, then
        // update the tokens accordingly.
        self.updateTokensIfPresent(response);
        // This could potentially validate an invalidated user. This happens in
        // the case a password reset was applied. The refresh token is expired.
        // Reauthentication should revalidate the user.
        // User would remain non current if already signed out, but should be
        // enabled again.
        self.userInvalidatedError_ = null;
        return self.reload();
      })
      .then(function() {
        // Return the user credential response.
        return userCredential;
      });
  return /** @type {!goog.Promise<!fireauth.AuthEventManager.Result>} */ (
      this.registerPendingPromise_(
          p,
          // Skip invalidation check as reauthentication could revalidate a
          // user.
          true));
};


/**
 * Sends the verification email to the email in the user's account.
 * @param {?Object=} opt_actionCodeSettings The optional action code settings
 *     object.
 * @return {!goog.Promise<void>}
 */
fireauth.AuthUser.prototype.sendEmailVerification =
    function(opt_actionCodeSettings) {
  var self = this;
  var idToken = null;
  // Register this pending promise. This will also check for user invalidation.
  return this.registerPendingPromise_(
      // Wrap in promise as ActionCodeSettings constructor could throw a
      // synchronous error if invalid arguments are specified.
      this.getIdToken().then(function(latestIdToken) {
        idToken = latestIdToken;
        if (typeof opt_actionCodeSettings !== 'undefined' &&
            // Ignore empty objects.
            !goog.object.isEmpty(opt_actionCodeSettings)) {
          return new fireauth.ActionCodeSettings(
              /** @type {!Object} */ (opt_actionCodeSettings)).buildRequest();
        }
        return {};
      })
      .then(function(additionalRequestData) {
        return self.rpcHandler_.sendEmailVerification(
            /** @type {string} */ (idToken), additionalRequestData);
      })
      .then(function(email) {
        if (self['email'] != email) {
          // Our local copy does not have an email. If the email changed,
          // reload the user.
          return self.reload();
        }
      })
      .then(function() {
        // Return nothing.
      }));
};


/**
 * Sends the verification email before updating the email on the user.
 * @param {string} newEmail The new email.
 * @param {?Object=} opt_actionCodeSettings The optional action code settings
 *     object.
 * @return {!goog.Promise<void>}
 */
fireauth.AuthUser.prototype.verifyBeforeUpdateEmail =
    function(newEmail, opt_actionCodeSettings) {
  var self = this;
  var idToken = null;
  // Register this pending promise. This will also check for user invalidation.
  return this.registerPendingPromise_(
      // Wrap in promise as ActionCodeSettings constructor could throw a
      // synchronous error if invalid arguments are specified.
      this.getIdToken().then(function(latestIdToken) {
        idToken = latestIdToken;
        if (typeof opt_actionCodeSettings !== 'undefined' &&
            // Ignore empty objects.
            !goog.object.isEmpty(opt_actionCodeSettings)) {
          return new fireauth.ActionCodeSettings(
              /** @type {!Object} */ (opt_actionCodeSettings)).buildRequest();
        }
        return {};
      })
      .then(function(additionalRequestData) {
        return self.rpcHandler_.verifyBeforeUpdateEmail(
            /** @type {string} */ (idToken), newEmail, additionalRequestData);
      })
      .then(function(email) {
        if (self['email'] != email) {
          // If the local copy of the email on user is outdated, reload the
          // user.
          return self.reload();
        }
      })
      .then(function() {
        // Return nothing.
      }));
};


/**
 * Destroys the user object and makes further operations invalid. Sensitive
 * fields (refreshToken) are also cleared.
 */
fireauth.AuthUser.prototype.destroy = function() {
  // Cancel all pending promises.
  for (var i = 0; i < this.pendingPromises_.length; i++) {
    this.pendingPromises_[i].cancel(fireauth.authenum.Error.MODULE_DESTROYED);
  }
  // Stop listening to language code changes.
  this.setLanguageCodeChangeDispatcher(null);
  // Stop listening to emulator config changes.
  this.setEmulatorConfigChangeDispatcher(null);
  // Stop listening to framework changes.
  this.setFrameworkChangeDispatcher(null);
  // Empty pending promises array.
  this.pendingPromises_ = [];
  this.destroyed_ = true;
  // Stop proactive refresh if running.
  this.stopProactiveRefresh();
  fireauth.object.setReadonlyProperty(this, 'refreshToken', null);
  // Make sure the destroyed user is unsubscribed from Auth event handling.
  if (this.authEventManager_) {
    this.authEventManager_.unsubscribe(this);
  }
};


/**
 * Takes in a pending promise, saves it and adds a clean up callback which
 * forgets the pending promise after it is fulfilled and echoes the promise
 * back. If in the process, a user invalidation error is detected, caches the
 * error so next time a call is made on the user, the operation will fail with
 * the cached error.
 * @param {!goog.Promise<*, *>|!goog.Promise<void>} p The pending promise.
 * @param {boolean=} opt_skipInvalidationCheck Whether to skip invalidation
 *     check.
 * @return {!goog.Promise<*, *>|!goog.Promise<void>}
 * @private
 */
fireauth.AuthUser.prototype.registerPendingPromise_ =
    function(p, opt_skipInvalidationCheck) {
  var self = this;
  // Check if user invalidation occurs.
  var processedP = this.checkIfInvalidated_(p, opt_skipInvalidationCheck);
  // Save created promise in pending list.
  this.pendingPromises_.push(processedP);
  processedP.thenAlways(function() {
    // When fulfilled, remove from pending list.
    goog.array.remove(self.pendingPromises_, processedP);
  });
  // Return the promise.
  return processedP
      .thenCatch(function(error) {
        var multiFactorError = null;
        if (error && error['code'] === 'auth/multi-factor-auth-required') {
          multiFactorError = fireauth.MultiFactorError.fromPlainObject(
              error.toPlainObject(),
              self.getAuth_(),
              goog.bind(self.handleMultiFactorIdTokenResolver_, self));
        }
        throw multiFactorError || error;
      });
};


/**
 * Completes multi-factor sign-in. This is only relevant for re-authentication
 * flows.
 * @param {{idToken: string, refreshToken: string}} response The successful
 *     sign-in response containing the new ID tokens.
 * @return {!goog.Promise<!fireauth.AuthEventManager.Result>} A Promise that
 *     resolves with the updated `UserCredential`.
 * @private
 */
fireauth.AuthUser.prototype.handleMultiFactorIdTokenResolver_ =
    function(response) {
  var userCredential = null;
  var self = this;
  // Validate token response matches current user ID.
  var p = fireauth.AuthCredential.verifyTokenResponseUid(
      goog.Promise.resolve(response),
      self['uid'])
      .then(function(response) {
        // Get credential from response if available.
        userCredential = self.getUserCredential_(
            response, fireauth.constants.OperationType.REAUTHENTICATE);
        // If the credential is valid and matches the current user ID, then
        // update the tokens accordingly.
        self.updateTokensIfPresent(response);
        // This could potentially validate an invalidated user.
        self.userInvalidatedError_ = null;
        // Reload the user with the latest profile.
        return self.reload();
      })
      .then(function() {
        // Return the user credential response.
        return userCredential;
      });
  return /** @type {!goog.Promise<!fireauth.AuthEventManager.Result>} */ (
      this.registerPendingPromise_(
          p,
          // Skip invalidation check as reauthentication could revalidate a
          // user.
          true));
};


/**
 * Check if user invalidation occurs. If so, it caches the error so it can be
 * thrown immediately the next time an operation is run on the user.
 * @param {!goog.Promise<*, *>|!goog.Promise<void>} p The pending promise.
 * @param {boolean=} opt_skipInvalidationCheck Whether to skip invalidation
 *     check.
 * @return {!goog.Promise<*, *>|!goog.Promise<void>}
 * @private
 */
fireauth.AuthUser.prototype.checkIfInvalidated_ =
    function(p, opt_skipInvalidationCheck) {
  var self = this;
  // Already invalidated, reject with token expired error.
  // Unless invalidation check is to be skipped.
  if (this.userInvalidatedError_ && !opt_skipInvalidationCheck) {
    // Cancel pending promise.
    p.cancel();
    // Reject with cached error.
    return goog.Promise.reject(this.userInvalidatedError_);
  }
  return p.thenCatch(function(error) {
    // Session invalidated.
    if (fireauth.AuthUser.isUserInvalidated_(error)) {
      // Notify listeners of invalidated session.
      if (!self.userInvalidatedError_) {
        self.notifyUserInvalidatedListeners_();
      }
      // Cache the invalidation error.
      self.userInvalidatedError_ = /** @type {!fireauth.AuthError} */ (error);
    }
    // Rethrow the error.
    throw error;
  });
};


/**
 * @return {!Object} The object representation of the user instance.
 * @override
 */
fireauth.AuthUser.prototype.toJSON = function() {
  // Return the plain object representation in case JSON.stringify is called on
  // a user instance.
  return this.toPlainObject();
};


/**
 * @return {!Object} The object representation of the user instance.
 */
fireauth.AuthUser.prototype.toPlainObject = function() {
  var obj = {
    'uid': this['uid'],
    'displayName': this['displayName'],
    'photoURL': this['photoURL'],
    'email': this['email'],
    'emailVerified': this['emailVerified'],
    'phoneNumber': this['phoneNumber'],
    'isAnonymous': this['isAnonymous'],
    'tenantId': this['tenantId'],
    'providerData': [],
    'apiKey': this.apiKey_,
    'appName': this.appName_,
    'authDomain': this.authDomain_,
    'stsTokenManager': this.stsTokenManager_.toPlainObject(),
    // Redirect event ID must be maintained in case there is a pending redirect
    // event.
    'redirectEventId': this.getRedirectEventId()
  };
  // Extend user plain object with metadata object.
  if (this['metadata']) {
    goog.object.extend(obj, this['metadata'].toPlainObject());
  }
  goog.array.forEach(this['providerData'], function(userInfo) {
    obj['providerData'].push(fireauth.object.makeWritableCopy(userInfo));
  });
  // Extend plain object with multi-factor user data.
  goog.object.extend(obj, this.multiFactorUser_.toPlainObject());
  return obj;
};


/**
 * Converts a plain user object to {@code fireauth.AuthUser}.
 * @param {!Object} user The object representation of the user instance.
 * @return {?fireauth.AuthUser} The Firebase user object corresponding to
 *     object.
 */
fireauth.AuthUser.fromPlainObject = function(user) {
  if (!user['apiKey']) {
    return null;
  }
  var options = {
    'apiKey': user['apiKey'],
    'authDomain': user['authDomain'],
    'appName': user['appName'],
    'emulatorConfig': user['emulatorConfig']
  };
  // Convert to server response format. Constructor does not take
  // stsTokenManager toPlainObject as that format is different than the return
  // server response which is always used to initialize a user instance.
  var stsTokenManagerResponse = {};
  if (user['stsTokenManager'] &&
      user['stsTokenManager']['accessToken']) {
    stsTokenManagerResponse[fireauth.RpcHandler.AuthServerField.ID_TOKEN] =
        user['stsTokenManager']['accessToken'];
    // Refresh token could be expired.
    stsTokenManagerResponse[fireauth.RpcHandler.AuthServerField.REFRESH_TOKEN] =
        user['stsTokenManager']['refreshToken'] || null;
  } else {
    // Token response is a required field.
    return null;
  }
  var firebaseUser = new fireauth.AuthUser(options,
      stsTokenManagerResponse,
      /** @type {!fireauth.AuthUser.AccountInfo} */ (user));
  if (user['providerData']) {
    goog.array.forEach(user['providerData'], function(userInfo) {
      if (userInfo) {
        firebaseUser.addProviderData(/** @type {!fireauth.AuthUserInfo} */ (
            fireauth.object.makeReadonlyCopy(userInfo)));
      }
    });
  }
  // Redirect event ID must be restored to complete any pending link with
  // redirect operation owned by this user.
  if (user['redirectEventId']) {
    firebaseUser.setRedirectEventId(user['redirectEventId']);
  }
  return firebaseUser;
};



/**
 * Factory method for initializing a Firebase user object and populating its
 * user info. This is the recommended way for initializing a user externally.
 * On sign in/up operation, the server returns a token response. The response is
 * all that is needed to initialize this user.
 * @param {!Object} appOptions The application options.
 * @param {!Object} stsTokenResponse The server STS token response.
 * @param {?fireauth.storage.RedirectUserManager=}
 *     opt_redirectStorageManager The utility used to store and delete a user on
 *     link with redirect.
 * @param {?Array<string>=} opt_frameworks The list of frameworks to log on the
 *     user on initialization.
 * @return {!goog.Promise<!fireauth.AuthUser>}
 */
fireauth.AuthUser.initializeFromIdTokenResponse = function(appOptions,
    stsTokenResponse, opt_redirectStorageManager, opt_frameworks) {
  // Initialize the Firebase Auth user.
  var user = new fireauth.AuthUser(
      appOptions, stsTokenResponse);
  // If redirect storage manager provided, set it.
  if (opt_redirectStorageManager) {
    user.setRedirectStorageManager(opt_redirectStorageManager);
  }
  // If frameworks provided, set it.
  if (opt_frameworks) {
    user.setFramework(opt_frameworks);
  }
  // Updates the user info and data and resolves with a user instance.
  return user.reload().then(function() {
    return user;
  });
};


/**
 * Returns an AuthUser copy of the provided user using the provided parameters
 * without making any network request.
 * @param {!fireauth.AuthUser} user The user to be copied.
 * @param {?Object=} opt_appOptions The application options.
 * @param {?fireauth.storage.RedirectUserManager=}
 *     opt_redirectStorageManager The utility used to store and delete a user on
 *     link with redirect.
 * @param {?Array<string>=} opt_frameworks The list of frameworks to log on the
 *     user on initialization.
 * @return {!fireauth.AuthUser}
 */
fireauth.AuthUser.copyUser = function(user, opt_appOptions,
    opt_redirectStorageManager, opt_frameworks) {
  var appOptions = opt_appOptions || {
    'apiKey': user.apiKey_,
    'authDomain': user.authDomain_,
    'appName': user.appName_
  };
  var newUser = new fireauth.AuthUser(
      appOptions, user.getStsTokenManager().toServerResponse());
  // If redirect storage manager provided, set it.
  if (opt_redirectStorageManager) {
    newUser.setRedirectStorageManager(opt_redirectStorageManager);
  }
  // If frameworks provided, set it.
  if (opt_frameworks) {
    newUser.setFramework(opt_frameworks);
  }
  // Copy remaining properties.
  newUser.copy(user);
  return newUser;
};
