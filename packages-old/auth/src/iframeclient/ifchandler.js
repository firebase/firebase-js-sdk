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
 * @fileoverview Defines fireauth.iframeclient.IfcHandler used to communicate
 * with the serverless widget.
 */

goog.provide('fireauth.iframeclient.IfcHandler');
goog.provide('fireauth.iframeclient.IframeUrlBuilder');
goog.provide('fireauth.iframeclient.OAuthUrlBuilder');

goog.require('fireauth.AuthError');
goog.require('fireauth.AuthEvent');
goog.require('fireauth.AuthProvider');
goog.require('fireauth.InvalidOriginError');
goog.require('fireauth.OAuthSignInHandler');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.constants');
goog.require('fireauth.iframeclient.IframeWrapper');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Timer');
goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.object');


/**
 * The OAuth handler and iframe prototcol.
 * @const {string}
 * @suppress {const|duplicate}
 */
fireauth.iframeclient.SCHEME = 'https';



/**
 * The OAuth handler and iframe port number.
 * @const {?number}
 * @suppress {const|duplicate}
 */
fireauth.iframeclient.PORT_NUMBER = null;



/**
 * The iframe URL builder used to build the iframe widget URL.
 * @param {string} authDomain The application authDomain.
 * @param {string} apiKey The API key.
 * @param {string} appName The App name.
 * @param {?fireauth.constants.EmulatorSettings=} emulatorConfig The emulator
 *     configuration.
 * @constructor
 */
fireauth.iframeclient.IframeUrlBuilder = function(authDomain, apiKey, appName, emulatorConfig) {
  /** @private {string} The application authDomain. */
  this.authDomain_ = authDomain;
  /** @private {string} The API key. */
  this.apiKey_ = apiKey;
  /** @private {string} The App name. */
  this.appName_ = appName;
  /**
   * @private @const {?fireauth.constants.EmulatorSettings|undefined}
   * The emulator configuration.
   */
  this.emulatorConfig_ = emulatorConfig;
  /** @private {?string|undefined} The client version. */
  this.v_ = null;
  let uri;
  if (this.emulatorConfig_) {
    const emulatorUri = goog.Uri.parse(this.emulatorConfig_.url);
    uri = goog.Uri.create(
      emulatorUri.getScheme(),
      null,
      emulatorUri.getDomain(),
      emulatorUri.getPort(),
      '/emulator/auth/iframe',
      null,
      null);
  } else {
    uri = goog.Uri.create(
      fireauth.iframeclient.SCHEME,
      null,
      this.authDomain_,
      fireauth.iframeclient.PORT_NUMBER,
      '/__/auth/iframe',
      null,
      null);
  }
  /**
   * @private @const {!goog.Uri} The URI object used to build the iframe URL.
   */
  this.uri_ = uri;
  this.uri_.setParameterValue('apiKey', this.apiKey_);
  this.uri_.setParameterValue('appName', this.appName_);
  /** @private {?string|undefined} The endpoint ID. */
  this.endpointId_ = null;
  /** @private {!Array<string>} The list of framework IDs. */
  this.frameworks_ = [];
};


/**
 * Sets the client version.
 * @param {?string|undefined} v The client version.
 * @return {!fireauth.iframeclient.IframeUrlBuilder} The current iframe URL
 *     builder instance.
 */
fireauth.iframeclient.IframeUrlBuilder.prototype.setVersion = function(v) {
  this.v_ = v;
  return this;
};


/**
 * Sets the endpoint ID.
 * @param {?string|undefined} eid The endpoint ID (staging, test Gaia, etc).
 * @return {!fireauth.iframeclient.IframeUrlBuilder} The current iframe URL
 *     builder instance.
 */
fireauth.iframeclient.IframeUrlBuilder.prototype.setEndpointId = function(eid) {
  this.endpointId_ = eid;
  return this;
};


/**
 * Sets the list of frameworks to pass to the iframe.
 * @param {?Array<string>|undefined} frameworks The list of frameworks to log.
 * @return {!fireauth.iframeclient.IframeUrlBuilder} The current iframe URL
 *     builder instance.
 */
fireauth.iframeclient.IframeUrlBuilder.prototype.setFrameworks =
    function(frameworks) {
  this.frameworks_ = goog.array.clone(frameworks || []);
  return this;
};


/**
 * Modifes the URI with the relevant Auth provider parameters.
 * @return {string} The constructed OAuth URL string.
 * @override
 */
fireauth.iframeclient.IframeUrlBuilder.prototype.toString = function() {
  // Pass the client version if available.
  if (this.v_) {
    this.uri_.setParameterValue('v', this.v_);
  } else {
    this.uri_.removeParameter('v');
  }
  // Pass the endpoint ID if available.
  if (this.endpointId_) {
    this.uri_.setParameterValue('eid', this.endpointId_);
  } else {
    this.uri_.removeParameter('eid');
  }
  // Pass the list of frameworks if available.
  if (this.frameworks_.length) {
    this.uri_.setParameterValue('fw', this.frameworks_.join(','));
  } else {
    this.uri_.removeParameter('fw');
  }
  return this.uri_.toString();
};



/**
 * The OAuth URL builder used to build the OAuth handler widget URL.
 * @param {string} authDomain The application authDomain.
 * @param {string} apiKey The API key.
 * @param {string} appName The App name.
 * @param {string} authType The Auth operation type.
 * @param {!fireauth.AuthProvider} provider The Auth provider that the OAuth
 *     handler request is built to sign in to.
 * @param {?fireauth.constants.EmulatorSettings=} emulatorConfig The emulator
 *     configuration.
 * @constructor
 */
fireauth.iframeclient.OAuthUrlBuilder =
    function(authDomain, apiKey, appName, authType, provider, emulatorConfig) {
  /** @private {string} The application authDomain. */
  this.authDomain_ = authDomain;
  /** @private {string} The API key. */
  this.apiKey_ = apiKey;
  /** @private {string} The App name. */
  this.appName_ = appName;
  /** @private {string} The Auth operation type. */
  this.authType_ = authType;
  /**
   * @private @const {?fireauth.constants.EmulatorSettings|undefined}
   * The emulator configuration.
   */
  this.emulatorConfig_ = emulatorConfig;
  /**
   * @private {?string|undefined} The redirect URL used in redirect operations.
   */
  this.redirectUrl_ = null;
  /** @private {?string|undefined} The event ID. */
  this.eventId_ = null;
  /** @private {?string|undefined} The client version. */
  this.v_ = null;
  /**
   * @private {!fireauth.AuthProvider} The Firebase Auth provider that the OAuth
   *     handler request is built to sign in to.
   */
  this.provider_ = provider;
  /** @private {?string|undefined} The endpoint ID. */
  this.endpointId_ = null;
  /** @private {?string|undefined} The tenant ID. */
  this.tenantId_ = null;
};


/**
 * Sets the redirect URL.
 * @param {?string|undefined} redirectUrl The redirect URL used in redirect
 *     operations.
 * @return {!fireauth.iframeclient.OAuthUrlBuilder} The current OAuth URL
 *     builder instance.
 */
fireauth.iframeclient.OAuthUrlBuilder.prototype.setRedirectUrl =
    function(redirectUrl) {
  this.redirectUrl_ = redirectUrl;
  return this;
};


/**
 * Sets the event ID.
 * @param {?string|undefined} eventId The event ID.
 * @return {!fireauth.iframeclient.OAuthUrlBuilder} The current OAuth URL
 *     builder instance.
 */
fireauth.iframeclient.OAuthUrlBuilder.prototype.setEventId = function(eventId) {
  this.eventId_ = eventId;
  return this;
};


/**
 * Sets the tenant ID.
 * @param {?string|undefined} tenantId The event ID.
 * @return {!fireauth.iframeclient.OAuthUrlBuilder} The current OAuth URL
 *     builder instance.
 */
fireauth.iframeclient.OAuthUrlBuilder.prototype.setTenantId =
    function(tenantId) {
  this.tenantId_ = tenantId;
  return this;
};


/**
 * Sets the client version.
 * @param {?string|undefined} v The client version.
 * @return {!fireauth.iframeclient.OAuthUrlBuilder} The current OAuth URL
 *     builder instance.
 */
fireauth.iframeclient.OAuthUrlBuilder.prototype.setVersion = function(v) {
  this.v_ = v;
  return this;
};


/**
 * Sets the endpoint ID.
 * @param {?string|undefined} eid The endpoint ID (staging, test Gaia, etc).
 * @return {!fireauth.iframeclient.OAuthUrlBuilder} The current OAuth URL
 *     builder instance.
 */
fireauth.iframeclient.OAuthUrlBuilder.prototype.setEndpointId = function(eid) {
  this.endpointId_ = eid;
  return this;
};


/**
 * Sets any additional optional parameters. This will overwrite any previously
 * set additional parameters.
 * @param {?Object<string, string>|undefined} additionalParams The optional
 *     additional parameters.
 * @return {!fireauth.iframeclient.OAuthUrlBuilder} The current OAuth URL
 *     builder instance.
 */
fireauth.iframeclient.OAuthUrlBuilder.prototype.setAdditionalParameters =
    function(additionalParams) {
  this.additionalParams_ = goog.object.clone(additionalParams || null);
  return this;
};


/**
 * Modifies the URI with the relevant Auth provider parameters.
 * @return {string} The constructed OAuth URL string.
 * @override
 */
fireauth.iframeclient.OAuthUrlBuilder.prototype.toString = function () {
  var uri;
  if (this.emulatorConfig_) {
    const emulatorUri = goog.Uri.parse(this.emulatorConfig_.url);
    uri = goog.Uri.create(
      emulatorUri.getScheme(),
      null,
      emulatorUri.getDomain(),
      emulatorUri.getPort(),
      '/emulator/auth/handler',
      null,
      null);
  } else {
    uri = goog.Uri.create(
      fireauth.iframeclient.SCHEME,
      null,
      this.authDomain_,
      fireauth.iframeclient.PORT_NUMBER,
      '/__/auth/handler',
      null,
      null);
  }
  uri.setParameterValue('apiKey', this.apiKey_);
  uri.setParameterValue('appName', this.appName_);
  uri.setParameterValue('authType', this.authType_);

  // Add custom parameters for OAuth1/OAuth2 providers.
  if (this.provider_['isOAuthProvider']) {
    // Set default language if available and no language already set.
    /** @type {!fireauth.FederatedProvider} */ (this.provider_)
        .setDefaultLanguage(this.getAuthLanguage_());
    uri.setParameterValue('providerId', this.provider_['providerId']);
    var customParameters = /** @type {!fireauth.FederatedProvider} */ (
        this.provider_).getCustomParameters();
    if (!goog.object.isEmpty(customParameters)) {
      uri.setParameterValue(
          'customParameters',
          /** @type {string} */ (fireauth.util.stringifyJSON(customParameters))
          );
    }
  }

  // Add scopes for OAuth2 providers.
  if (typeof this.provider_.getScopes === 'function') {
    var scopes = this.provider_.getScopes();
    if (scopes.length) {
      uri.setParameterValue('scopes', scopes.join(','));
    }
  }

  if (this.redirectUrl_) {
    uri.setParameterValue('redirectUrl', this.redirectUrl_);
  } else {
    uri.removeParameter('redirectUrl');
  }
  if (this.eventId_) {
    uri.setParameterValue('eventId', this.eventId_);
  } else {
    uri.removeParameter('eventId');
  }
  // Pass the client version if available.
  if (this.v_) {
    uri.setParameterValue('v', this.v_);
  } else {
    uri.removeParameter('v');
  }
  if (this.additionalParams_) {
    for (var key in this.additionalParams_) {
      if (this.additionalParams_.hasOwnProperty(key) &&
          // Don't overwrite other existing parameters.
          !uri.getParameterValue(key)) {
        uri.setParameterValue(key, this.additionalParams_[key]);
      }
    }
  }
  // Pass the tenant ID if available.
  if (this.tenantId_) {
    uri.setParameterValue('tid', this.tenantId_);
  } else {
    uri.removeParameter('tid');
  }
  // Pass the endpoint ID if available.
  if (this.endpointId_) {
    uri.setParameterValue('eid', this.endpointId_);
  } else {
    uri.removeParameter('eid');
  }
  // Append any framework IDs to the handler URL to log in handler RPC requests.
  var frameworks = this.getAuthFrameworks_();
  if (frameworks.length) {
    uri.setParameterValue('fw', frameworks.join(','));
  }
  return uri.toString();
};


/**
 * Returns the current Auth instance's language code.
 * @return {?string} The corresponding language code.
 * @private
 */
fireauth.iframeclient.OAuthUrlBuilder.prototype.getAuthLanguage_ = function() {
  try {
    // Get the Auth instance for the current App identified by the App name.
    // This could fail if, for example, the App instance was deleted.
    return firebase['app'](this.appName_)['auth']().getLanguageCode();
  } catch (e) {
    return null;
  }
};


/**
 * Returns the list of Firebase frameworks used for logging purposes.
 * @return {!Array<string>} The list of corresponding Firebase frameworks.
 * @private
 */
fireauth.iframeclient.OAuthUrlBuilder.prototype.getAuthFrameworks_ =
    function() {
  return fireauth.iframeclient.OAuthUrlBuilder.getAuthFrameworksForApp_(
      this.appName_);
};


/**
 * Returns the list of Firebase frameworks used for logging purposes
 * corresponding to the Firebase App name provided.
 * @param {string} appName The Firebase App name.
 * @return {!Array<string>} The list of corresponding Firebase frameworks.
 * @private
 */
fireauth.iframeclient.OAuthUrlBuilder.getAuthFrameworksForApp_ =
    function(appName) {
  try {
    // Get the Auth instance's list of Firebase framework IDs for the current
    // App identified by the App name.
    // This could fail if, for example, the App instance was deleted.
    return firebase['app'](appName)['auth']().getFramework();
  } catch (e) {
    return [];
  }
};



/**
 * Initializes the ifcHandler which provides the mechanism to listen to Auth
 * events on the hidden iframe.
 * @param {string} authDomain The firebase authDomain used to determine the
 *     OAuth helper page domain.
 * @param {string} apiKey The API key for sending backend Auth requests.
 * @param {string} appName The App ID for the Auth instance that triggered this
 *     request.
 * @param {?string=} opt_clientVersion The optional client version string.
 * @param {?string=} opt_endpointId The endpoint ID (staging, test Gaia, etc).
 * @param {?fireauth.constants.EmulatorSettings=} emulatorConfig The emulator
 *     configuration.
 * @constructor
 * @implements {fireauth.OAuthSignInHandler}
 */
fireauth.iframeclient.IfcHandler = function(authDomain, apiKey, appName,
    opt_clientVersion, opt_endpointId, emulatorConfig) {
  /** @private {string} The Auth domain. */
  this.authDomain_ = authDomain;
  /** @private {string} The API key. */
  this.apiKey_ = apiKey;
  /** @private {string} The App name. */
  this.appName_ = appName;
  /**
   * @private @const {?fireauth.constants.EmulatorSettings|undefined}
   * The emulator configuration.
   */
  this.emulatorConfig_ = emulatorConfig;
  /** @private {?string} The client version. */
  this.clientVersion_ = opt_clientVersion || null;
  /** @private {?string} The Auth endpoint ID. */
  this.endpointId_ = opt_endpointId || null;
  // Delay RPC handler and iframe URL initialization until needed to ensure
  // logged frameworks are propagated to the iframe.
  /** @private {?string} The full client version string. */
  this.fullClientVersion_ = null;
  /** @private {?string} The iframe URL. */
  this.iframeUrl_ = null;
  /** @private {?fireauth.RpcHandler} The RPC handler for provided API key. */
  this.rpcHandler_ = null;
  /**
   * @private {!Array<!function(?fireauth.AuthEvent)>} The Auth event
   *     listeners.
   */
  this.authEventListeners_ = [];
  // Delay origin validator determination until needed, so the error is not
  // thrown in the background. This will also prevent the getProjectConfig RPC
  // until it is required.
  /** @private {?goog.Promise} The origin validator. */
  this.originValidator_ = null;
  /** @private {?goog.Promise} The initialization promise. */
  this.isInitialized_ = null;
};


/**
 * Validates the provided URL.
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler used to validate the
 *     requested origin.
 * @param {string=} opt_origin The optional page origin. If not provided, the
 *     window.location.href value is used.
 * @return {!goog.Promise} The promise that resolves if the provided origin is
 *     valid.
 * @private
 */
fireauth.iframeclient.IfcHandler.getOriginValidator_ =
    function(rpcHandler, opt_origin) {
  var origin = opt_origin || fireauth.util.getCurrentUrl();
  return rpcHandler.getAuthorizedDomains().then(function(authorizedDomains) {
    if (!fireauth.util.isAuthorizedDomain(authorizedDomains, origin)) {
      throw new fireauth.InvalidOriginError(fireauth.util.getCurrentUrl());
    }
  });
};


/**
 * Initializes the iframe client wrapper.
 * @return {!goog.Promise} The promise that resolves on initialization.
 */
fireauth.iframeclient.IfcHandler.prototype.initialize = function() {
  // Already initialized.
  if (this.isInitialized_) {
    return this.isInitialized_;
  }
  var self = this;
  this.isInitialized_ = fireauth.util.onDomReady().then(function() {
    /**
     * @private {!fireauth.iframeclient.IframeWrapper} The iframe wrapper
     *     instance.
     */
    self.iframeWrapper_ = new fireauth.iframeclient.IframeWrapper(
        self.getIframeUrl());
    // Register all event listeners to Auth event messages sent from Auth
    // iframe.
    self.registerEvents_();
  });
  return this.isInitialized_;
};


/**
 * Waits for popup window to close. When closed start timeout listener for popup
 * pending promise. If in the process, it was detected that the iframe does not
 * support web storage, the popup is closed and the web storage unsupported
 * error is thrown.
 * @param {!Window} popupWin The popup window.
 * @param {!function(!fireauth.AuthError)} onError The on error callback.
 * @param {number} timeoutDuration The time to wait in ms after the popup is
 *     closed before triggering the popup closed by user error.
 * @return {!goog.Promise}
 * @override
 */
fireauth.iframeclient.IfcHandler.prototype.startPopupTimeout =
    function(popupWin, onError, timeoutDuration) {
  // Expire pending timeout promise for popup operation.
  var popupClosedByUserError = new fireauth.AuthError(
      fireauth.authenum.Error.POPUP_CLOSED_BY_USER);
  // If web storage is disabled in the iframe, expire popup timeout quickly with
  // this error.
  var webStorageNotSupportedError = new fireauth.AuthError(
      fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  var self = this;
  var isResolved = false;
  // Wait for the iframe to be ready first.
  return this.initializeAndWait().then(function() {
    // We do not return isWebStorageSupported() to ensure that this is backward
    // compatible.
    // Pushing the following client changes before updating the iframe to
    // respond to these events would continue to work.
    // The downside is that the popup could be closed before this resolves.
    // In that case, they would get an error that the popup was closed and not
    // the error that web storage is not supported, though that is unlikely
    // as isWebStorageSupported should execute faster than the popup timeout.
    // If web storage is not supported in the iframe, fail quickly.
    self.isWebStorageSupported().then(function(isSupported) {
      if (!isSupported) {
        // If not supported, close window.
        if (popupWin) {
          fireauth.util.closeWindow(popupWin);
        }
        onError(webStorageNotSupportedError);
        isResolved = true;
      }
    });
  }).thenCatch(function(error) {
    // Ignore any possible error in iframe embedding.
    // These types of errors will be handled in processPopup which will close
    // the popup too if that happens.
    return;
  }).then(function() {
    // Skip if already resolved.
    if (isResolved) {
      return;
    }
    // After the iframe is ready, wait for popup to close and then start timeout
    // check.
    return fireauth.util.onPopupClose(popupWin);
  }).then(function() {
    // Skip if already resolved.
    if (isResolved) {
      return;
    }
    return goog.Timer.promise(timeoutDuration).then(function() {
      // If this is already resolved or rejected, this will do nothing.
      onError(popupClosedByUserError);
    });
  });
};


/**
 * @return {boolean} Whether the handler should be initialized early.
 * @override
 */
fireauth.iframeclient.IfcHandler.prototype.shouldBeInitializedEarly =
    function() {
  var ua = fireauth.util.getUserAgentString();
  // Cannot run in the background (can't wait for iframe to be embedded
  // before triggering popup redirect) and is Safari (can only detect
  // localStorage in iframe via change event) => embed iframe ASAP.
  // Do the same for mobile browsers on iOS devices as they use the same
  // Safari implementation underneath.
  return !fireauth.util.runsInBackground(ua) &&
         !fireauth.util.iframeCanSyncWebStorage(ua);
};


/**
 * @return {boolean} Whether the sign-in handler in the current environment
 *     has volatile session storage.
 * @override
 */
fireauth.iframeclient.IfcHandler.prototype.hasVolatileStorage = function() {
  // Web environment with web storage enabled has stable sessionStorage.
  return false;
};


/**
 * Processes the popup request. The popup instance must be provided externally
 * and on error, the requestor must close the window.
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
fireauth.iframeclient.IfcHandler.prototype.processPopup = function(
    popupWin,
    mode,
    provider,
    onInitialize,
    onError,
    opt_eventId,
    opt_alreadyRedirected,
    opt_tenantId) {
  // processPopup is failing since it tries to access popup win when tab can
  // not run in background. For now bypass processPopup which runs
  // additional origin check not accounted above. Besides, iframe will never
  // hand result to parent if origin not whitelisted.
  // Error thrown by browser: Unable to establish a connection with the
  // popup. It may have been blocked by the browser.
  // If popup is null, startPopupTimeout will catch it without having the
  // above error getting triggered due to popup access from opener.

  // Reject immediately if the popup is blocked.
  if (!popupWin) {
    return goog.Promise.reject(
        new fireauth.AuthError(fireauth.authenum.Error.POPUP_BLOCKED));
  }
  // Already redirected and cannot run in the background, resolve quickly while
  // initializing.
  if (opt_alreadyRedirected && !fireauth.util.runsInBackground()) {
    // Initialize first before resolving.
    this.initializeAndWait().thenCatch(function(error) {
      fireauth.util.closeWindow(popupWin);
      onError(error);
    });
    onInitialize();
    // Already redirected.
    return goog.Promise.resolve();
  }
  // If origin validator not determined yet.
  if (!this.originValidator_) {
    this.originValidator_ =
        fireauth.iframeclient.IfcHandler.getOriginValidator_(
            this.getRpcHandler_());
  }
  var self = this;
  return this.originValidator_.then(function() {
    // After origin validation, wait for iframe to be ready before redirecting.
    var onReady = self.initializeAndWait().thenCatch(function(error) {
      fireauth.util.closeWindow(popupWin);
      onError(error);
      throw error;
    });
    onInitialize();
    return onReady;
  }).then(function() {
    // Popup and redirect operations work for OAuth providers only.
    fireauth.AuthProvider.checkIfOAuthSupported(provider);
    // Already redirected to intended destination, no need to redirect again.
    if (opt_alreadyRedirected) {
      return;
    }
    var oauthHelperWidgetUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            self.authDomain_,
            self.apiKey_,
            self.appName_,
            mode,
            provider,
            null,
            opt_eventId,
            self.clientVersion_,
            undefined,
            self.endpointId_,
            opt_tenantId,
            self.emulatorConfig_);
    // Redirect popup to OAuth helper widget URL.
    fireauth.util.goTo(oauthHelperWidgetUrl, /** @type {!Window} */ (popupWin));
  }).thenCatch(function(e) {
    // Force another origin validation.
    if (e.code == 'auth/network-request-failed') {
      self.originValidator_ = null;
    }
    throw e;
  });
};


/**
 * @return {!fireauth.RpcHandler} The RPC handler instance with the relevant
 *     endpoints, version and frameworks.
 * @private
 */
fireauth.iframeclient.IfcHandler.prototype.getRpcHandler_ = function() {
  if (!this.rpcHandler_) {
    this.fullClientVersion_ = this.clientVersion_ ?
        fireauth.util.getClientVersion(
            fireauth.util.ClientImplementation.JSCORE,
            this.clientVersion_,
            fireauth.iframeclient.OAuthUrlBuilder.getAuthFrameworksForApp_(
                this.appName_)) :
        null;
    this.rpcHandler_ = new fireauth.RpcHandler(
        this.apiKey_,
        // Get the client Auth endpoint used.
        fireauth.constants.getEndpointConfig(this.endpointId_),
        this.fullClientVersion_);
    if (this.emulatorConfig_) {
        this.rpcHandler_.updateEmulatorConfig(this.emulatorConfig_);
    }
  }
  return this.rpcHandler_;
};


/**
 * Processes the redirect request.
 * @param {!fireauth.AuthEvent.Type} mode The Auth event type.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @param {?string=} opt_eventId The optional event ID.
 * @param {?string=} opt_tenantId The optional tenant ID.
 * @return {!goog.Promise}
 * @override
 */
fireauth.iframeclient.IfcHandler.prototype.processRedirect =
    function(mode, provider, opt_eventId, opt_tenantId) {
  // If origin validator not determined yet.
  if (!this.originValidator_) {
    this.originValidator_ =
        fireauth.iframeclient.IfcHandler.getOriginValidator_(
            this.getRpcHandler_());
  }
  var self = this;
  // Make sure origin is validated.
  return this.originValidator_.then(function() {
    fireauth.AuthProvider.checkIfOAuthSupported(provider);
    var oauthHelperWidgetUrl =
        fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl(
            self.authDomain_,
            self.apiKey_,
            self.appName_,
            mode,
            provider,
            fireauth.util.getCurrentUrl(),
            opt_eventId,
            self.clientVersion_,
            undefined,
            self.endpointId_,
            opt_tenantId,
            self.emulatorConfig_);
    // Redirect to OAuth helper widget URL.
    fireauth.util.goTo(oauthHelperWidgetUrl);
  }).thenCatch(function(e) {
    // Force another origin validation on network errors.
    if (e.code == 'auth/network-request-failed') {
      self.originValidator_ = null;
    }
    throw e;
  });
};


/** @return {string} The iframe URL. */
fireauth.iframeclient.IfcHandler.prototype.getIframeUrl = function() {
  if (!this.iframeUrl_) {
    this.iframeUrl_ = fireauth.iframeclient.IfcHandler.getAuthIframeUrl(
      this.authDomain_,
      this.apiKey_,
      this.appName_,
      this.clientVersion_,
      this.endpointId_,
      fireauth.iframeclient.OAuthUrlBuilder.getAuthFrameworksForApp_(
        this.appName_),
      this.emulatorConfig_);
  }
  return this.iframeUrl_;
};


/**
 * @return {!goog.Promise} The promise that resolves when the iframe is ready.
 * @override
 */
fireauth.iframeclient.IfcHandler.prototype.initializeAndWait = function() {
  // Initialize if not initialized yet.
  var self = this;
  return this.initialize().then(function() {
    return self.iframeWrapper_.onReady();
  }).thenCatch(function(error) {
    // Reset origin validator.
    self.originValidator_ = null;
    // Reject iframe ready promise with network error.
    throw new fireauth.AuthError(
        fireauth.authenum.Error.NETWORK_REQUEST_FAILED);
  });
};


/**
 * @return {boolean} Whether the handler will unload the current page on
 *     redirect operations.
 * @override
 */
fireauth.iframeclient.IfcHandler.prototype.unloadsOnRedirect = function() {
  return true;
};


/**
 * @param {string} authDomain The Firebase authDomain used to determine the
 *     OAuth helper page domain.
 * @param {string} apiKey The API key for sending backend Auth requests.
 * @param {string} appName The App ID for the Auth instance that triggered this
 *     request.
 * @param {?string=} opt_clientVersion The optional client version string.
 * @param {?string=} opt_endpointId The endpoint ID (staging, test Gaia, etc).
 * @param {?Array<string>=} opt_frameworks The optional list of framework IDs.
 * @param {?fireauth.constants.EmulatorSettings=} emulatorConfig The emulator
 *     configuration.
 * @return {string} The data iframe src URL.
 */
fireauth.iframeclient.IfcHandler.getAuthIframeUrl = function(authDomain, apiKey,
    appName, opt_clientVersion, opt_endpointId, opt_frameworks, emulatorConfig) {
  // OAuth helper iframe URL.
  var builder = new fireauth.iframeclient.IframeUrlBuilder(
      authDomain, apiKey, appName, emulatorConfig);
  return builder
      .setVersion(opt_clientVersion)
      .setEndpointId(opt_endpointId)
      .setFrameworks(opt_frameworks)
      .toString();
};


/**
 * @param {string} authDomain The Firebase authDomain used to determine the
 *     OAuth helper page domain.
 * @param {string} apiKey The API key for sending backend Auth requests.
 * @param {string} appName The App ID for the Auth instance that triggered this
 *     request.
 * @param {string} authType The type of operation that depends on OAuth sign in.
 * @param {!fireauth.AuthProvider} provider The provider to sign in to.
 * @param {?string=} opt_redirectUrl The optional URL to redirect to on OAuth
 *     sign in completion.
 * @param {?string=} opt_eventId The optional event ID to identify on receipt.
 * @param {?string=} opt_clientVersion The optional client version string.
 * @param {?Object<string, string>=} opt_additionalParams The optional
 *     additional parameters.
 * @param {?string=} opt_endpointId The endpoint ID (staging, test Gaia, etc).
 * @param {?string=} opt_tenantId The optional tenant ID.
 * @param {?fireauth.constants.EmulatorSettings=} emulatorConfig The emulator
 *     configuration.
 * @return {string} The OAuth helper widget URL.
 */
fireauth.iframeclient.IfcHandler.getOAuthHelperWidgetUrl = function(
    authDomain,
    apiKey,
    appName,
    authType,
    provider,
    opt_redirectUrl,
    opt_eventId,
    opt_clientVersion,
    opt_additionalParams,
    opt_endpointId,
    opt_tenantId,
    emulatorConfig) {
  // OAuth helper widget URL.
  var builder = new fireauth.iframeclient.OAuthUrlBuilder(
      authDomain, apiKey, appName, authType, provider, emulatorConfig);
  return builder
      .setRedirectUrl(opt_redirectUrl)
      .setEventId(opt_eventId)
      .setVersion(opt_clientVersion)
      .setAdditionalParameters(opt_additionalParams)
      .setEndpointId(opt_endpointId)
      .setTenantId(opt_tenantId)
      .toString();
};


/**
 * Post message receiver event names.
 * @enum {string}
 */
fireauth.iframeclient.IfcHandler.ReceiverEvent = {
  AUTH_EVENT: 'authEvent'
};


/**
 * Post message sender event names.
 * @enum {string}
 */
fireauth.iframeclient.IfcHandler.SenderEvent = {
  WEB_STORAGE_SUPPORT_EVENT: 'webStorageSupport'
};


/**
 * Post message response field names.
 * @enum {string}
 */
fireauth.iframeclient.IfcHandler.Response = {
  STATUS: 'status',
  AUTH_EVENT: 'authEvent',
  WEB_STORAGE_SUPPORT: 'webStorageSupport'
};


/**
 * Post message status values.
 * @enum {string}
 */
fireauth.iframeclient.IfcHandler.Status = {
  ACK: 'ACK',
  ERROR: 'ERROR'
};


/**
 * Registers all event listeners.
 * @private
 */
fireauth.iframeclient.IfcHandler.prototype.registerEvents_ = function() {
  // Should be run in initialization.
  if (!this.iframeWrapper_) {
    throw new Error('IfcHandler must be initialized!');
  }
  var self = this;
  // Listen to Auth change events emitted from iframe.
  this.iframeWrapper_.registerEvent(
      fireauth.iframeclient.IfcHandler.ReceiverEvent.AUTH_EVENT,
      function(response) {
        var resolveResponse = {};
        if (response &&
            response[fireauth.iframeclient.IfcHandler.Response.AUTH_EVENT]) {
          var isHandled = false;
          // Get Auth event (plain object).
          var authEvent = fireauth.AuthEvent.fromPlainObject(
              response[fireauth.iframeclient.IfcHandler.Response.AUTH_EVENT]);
          // Trigger Auth change on all listeners.
          for (var i = 0; i < self.authEventListeners_.length; i++) {
            isHandled = self.authEventListeners_[i](authEvent) || isHandled;
          }
          // Return ack response to notify sender of success.
          resolveResponse = {};
          resolveResponse[fireauth.iframeclient.IfcHandler.Response.STATUS] =
              isHandled ? fireauth.iframeclient.IfcHandler.Status.ACK :
                  fireauth.iframeclient.IfcHandler.Status.ERROR;
          return goog.Promise.resolve(resolveResponse);
        }
        // Return error status if the response is invalid.
        resolveResponse[fireauth.iframeclient.IfcHandler.Response.STATUS] =
            fireauth.iframeclient.IfcHandler.Status.ERROR;
        return goog.Promise.resolve(resolveResponse);
      });
};


/**
 * @return {!goog.Promise<boolean>} Whether web storage is supported in the
 *     iframe.
 */
fireauth.iframeclient.IfcHandler.prototype.isWebStorageSupported = function() {
  var webStorageSupportEvent =
      fireauth.iframeclient.IfcHandler.SenderEvent.WEB_STORAGE_SUPPORT_EVENT;
  var message = {
    'type': webStorageSupportEvent
  };
  var self = this;
  // Initialize if not initialized yet.
  return this.initialize().then(function() {
    return self.iframeWrapper_.sendMessage(message);
  }).then(function(response) {
    // Parse the response and return the passed web storage support status.
    var key = fireauth.iframeclient.IfcHandler.Response.WEB_STORAGE_SUPPORT;
    if (response &&
        response.length &&
        typeof response[0][key] !== 'undefined') {
      return response[0][key];
    }
    // Internal error.
    throw new Error;
  });
};


/**
 * @param {!function(?fireauth.AuthEvent):boolean} listener The Auth event
 *     listener to add.
 * @override
 */
fireauth.iframeclient.IfcHandler.prototype.addAuthEventListener =
    function(listener) {
  this.authEventListeners_.push(listener);
};


/**
 * @param {!function(?fireauth.AuthEvent):boolean} listener The Auth event
 *     listener to remove.
 * @override
 */
fireauth.iframeclient.IfcHandler.prototype.removeAuthEventListener =
    function(listener) {
  goog.array.removeAllIf(this.authEventListeners_, function(ele) {
    return ele == listener;
  });
};
