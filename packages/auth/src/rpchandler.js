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
 * @fileoverview Utility for handling RPC requests to server.
 */
goog.provide('fireauth.RpcHandler');
goog.provide('fireauth.RpcHandler.ApiMethodHandler');
goog.provide('fireauth.RpcHandler.VerifyAssertionData');
goog.provide('fireauth.XmlHttpFactory');

goog.require('fireauth.AuthError');
goog.require('fireauth.AuthErrorWithCredential');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.idp.ProviderId');
goog.require('fireauth.object');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Uri');
goog.require('goog.format.EmailAddress');
goog.require('goog.html.TrustedResourceUrl');
goog.require('goog.json');
goog.require('goog.net.CorsXmlHttpFactory');
goog.require('goog.net.EventType');
goog.require('goog.net.FetchXmlHttpFactory');
goog.require('goog.net.XhrIo');
goog.require('goog.net.XmlHttpFactory');
goog.require('goog.net.jsloader');
goog.require('goog.object');
goog.require('goog.string.Const');



/**
 * Firebase Auth XmlHttpRequest factory. This is useful for environments like
 * Node.js where XMLHttpRequest does not exist. XmlHttpFactory would be
 * initialized using the polyfill XMLHttpRequest module.
 * @param {function(new:XMLHttpRequest)} xmlHttpRequest The xmlHttpRequest
 *     constructor.
 * @constructor
 * @extends {goog.net.XmlHttpFactory}
 * @final
 */
fireauth.XmlHttpFactory = function(xmlHttpRequest) {
  /**
   * @private {function(new:XMLHttpRequest)} The underlying XHR reference.
   */
  this.xmlHttpRequest_ = xmlHttpRequest;
  fireauth.XmlHttpFactory.base(this, 'constructor');
};
goog.inherits(fireauth.XmlHttpFactory, goog.net.XmlHttpFactory);


/**
 * @return {!goog.net.XhrLike|!XMLHttpRequest} A new XhrLike instance.
 * @override
 */
fireauth.XmlHttpFactory.prototype.createInstance = function() {
  return new this.xmlHttpRequest_();
};


/**
 * @return {!Object} Options describing how XHR objects obtained from this
 *     factory should be used.
 * @override
 */
fireauth.XmlHttpFactory.prototype.internalGetOptions = function() {
  return {};
};



/**
 * Creates an RPC request handler for the project specified by the API key.
 *
 * @param {string} apiKey The API key.
 * @param {?Object=} opt_config The RPC request processor configuration.
 * @param {?string=} opt_firebaseClientVersion The optional Firebase client
 *     version to log with requests to Firebase Auth server.
 * @constructor
 */
fireauth.RpcHandler = function(apiKey, opt_config, opt_firebaseClientVersion) {
  this.apiKey_ = apiKey;
  var config = opt_config || {};
  this.secureTokenEndpoint_ = config['secureTokenEndpoint'] ||
      fireauth.RpcHandler.SECURE_TOKEN_ENDPOINT_;
  /**
   * @private @const {!fireauth.util.Delay} The delay for secure token endpoint
   *     network timeout.
   */
  this.secureTokenTimeout_ = config['secureTokenTimeout'] ||
      fireauth.RpcHandler.DEFAULT_SECURE_TOKEN_TIMEOUT_;
  this.secureTokenHeaders_ = goog.object.clone(
      config['secureTokenHeaders'] ||
      fireauth.RpcHandler.DEFAULT_SECURE_TOKEN_HEADERS_);
  this.firebaseEndpoint_ = config['firebaseEndpoint'] ||
      fireauth.RpcHandler.FIREBASE_ENDPOINT_;
  /**
   * @private @const {!fireauth.util.Delay} The delay for Firebase Auth endpoint
   *     network timeout.
   */
  this.firebaseTimeout_ = config['firebaseTimeout'] ||
      fireauth.RpcHandler.DEFAULT_FIREBASE_TIMEOUT_;
  this.firebaseHeaders_ = goog.object.clone(
      config['firebaseHeaders'] ||
      fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_);
  // If Firebase client version needs to be logged too.
  if (opt_firebaseClientVersion) {
    // Log client version for Firebase Auth server.
    this.firebaseHeaders_['X-Client-Version'] = opt_firebaseClientVersion;
    // Log client version for securetoken server.
    this.secureTokenHeaders_['X-Client-Version'] = opt_firebaseClientVersion;
  }
  
  // Get XMLHttpRequest reference.
  var XMLHttpRequest = fireauth.RpcHandler.getXMLHttpRequest();
  if (!XMLHttpRequest && !fireauth.util.isWorker()) {
    // In a Node.js environment, xmlhttprequest module needs to be required.
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR,
        'The XMLHttpRequest compatibility library was not found.');
  }
  /** @private {!goog.net.XmlHttpFactory|undefined} The XHR factory. */
  this.rpcHandlerXhrFactory_ = undefined;
  // Initialize XHR factory. CORS does not apply in native environments or
  // workers so don't use CorsXmlHttpFactory in those cases.
  if (fireauth.util.isWorker()) {
    // For worker environment use FetchXmlHttpFactory.
    this.rpcHandlerXhrFactory_ = new goog.net.FetchXmlHttpFactory(
        /** @type {!WorkerGlobalScope} */ (self));
  } else if (fireauth.util.isNativeEnvironment()) {
    // For Node.js, this is the polyfill library. For other environments,
    // this is the native global XMLHttpRequest.
    this.rpcHandlerXhrFactory_ = new fireauth.XmlHttpFactory(
        /** @type {function(new:XMLHttpRequest)} */ (XMLHttpRequest));
  } else {
    // CORS Browser environment.
    this.rpcHandlerXhrFactory_ = new goog.net.CorsXmlHttpFactory();
  }
};


/**
 * @return {?function(new:XMLHttpRequest)|undefined} The current environment
 *     XMLHttpRequest. This is undefined for worker environment.
 */
fireauth.RpcHandler.getXMLHttpRequest = function() {
  // In Node.js XMLHttpRequest is polyfilled.
  var isNode = fireauth.util.getEnvironment() == fireauth.util.Env.NODE;
  var XMLHttpRequest = goog.global['XMLHttpRequest'] ||
      (isNode &&
       firebase.INTERNAL['node'] &&
       firebase.INTERNAL['node']['XMLHttpRequest']);
  return XMLHttpRequest;
};


/**
 * Enums for HTTP request methods.
 * @enum {string}
 */
fireauth.RpcHandler.HttpMethod = {
  POST: 'POST',
  GET: 'GET'
};


/**
 * Firebase Auth server error codes.
 * @enum {string}
 */
fireauth.RpcHandler.ServerError = {
  CAPTCHA_CHECK_FAILED: 'CAPTCHA_CHECK_FAILED',
  CORS_UNSUPPORTED: 'CORS_UNSUPPORTED',
  CREDENTIAL_MISMATCH: 'CREDENTIAL_MISMATCH',
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'CREDENTIAL_TOO_OLD_LOGIN_AGAIN',
  DYNAMIC_LINK_NOT_ACTIVATED: 'DYNAMIC_LINK_NOT_ACTIVATED',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',
  EXPIRED_OOB_CODE: 'EXPIRED_OOB_CODE',
  FEDERATED_USER_ID_ALREADY_LINKED: 'FEDERATED_USER_ID_ALREADY_LINKED',
  INVALID_APP_CREDENTIAL: 'INVALID_APP_CREDENTIAL',
  INVALID_APP_ID: 'INVALID_APP_ID',
  INVALID_CERT_HASH: 'INVALID_CERT_HASH',
  INVALID_CODE: 'INVALID_CODE',
  INVALID_CONTINUE_URI: 'INVALID_CONTINUE_URI',
  INVALID_CUSTOM_TOKEN: 'INVALID_CUSTOM_TOKEN',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_ID_TOKEN: 'INVALID_ID_TOKEN',
  INVALID_IDP_RESPONSE: 'INVALID_IDP_RESPONSE',
  INVALID_IDENTIFIER: 'INVALID_IDENTIFIER',
  INVALID_MESSAGE_PAYLOAD: 'INVALID_MESSAGE_PAYLOAD',
  INVALID_OAUTH_CLIENT_ID: 'INVALID_OAUTH_CLIENT_ID',
  INVALID_OOB_CODE: 'INVALID_OOB_CODE',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  INVALID_PHONE_NUMBER: 'INVALID_PHONE_NUMBER',
  INVALID_RECIPIENT_EMAIL: 'INVALID_RECIPIENT_EMAIL',
  INVALID_SENDER: 'INVALID_SENDER',
  INVALID_SESSION_INFO: 'INVALID_SESSION_INFO',
  INVALID_TEMPORARY_PROOF: 'INVALID_TEMPORARY_PROOF',
  MISSING_ANDROID_PACKAGE_NAME: 'MISSING_ANDROID_PACKAGE_NAME',
  MISSING_APP_CREDENTIAL: 'MISSING_APP_CREDENTIAL',
  MISSING_CODE: 'MISSING_CODE',
  MISSING_CONTINUE_URI: 'MISSING_CONTINUE_URI',
  MISSING_CUSTOM_TOKEN: 'MISSING_CUSTOM_TOKEN',
  MISSING_IOS_BUNDLE_ID: 'MISSING_IOS_BUNDLE_ID',
  MISSING_OOB_CODE: 'MISSING_OOB_CODE',
  MISSING_PASSWORD: 'MISSING_PASSWORD',
  MISSING_PHONE_NUMBER: 'MISSING_PHONE_NUMBER',
  MISSING_SESSION_INFO: 'MISSING_SESSION_INFO',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  PASSWORD_LOGIN_DISABLED: 'PASSWORD_LOGIN_DISABLED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'TOO_MANY_ATTEMPTS_TRY_LATER',
  UNAUTHORIZED_DOMAIN: 'UNAUTHORIZED_DOMAIN',
  USER_CANCELLED: 'USER_CANCELLED',
  USER_DISABLED: 'USER_DISABLED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  WEAK_PASSWORD: 'WEAK_PASSWORD'
};


/**
 * A map of server error codes to client errors.
 * @typedef {!Object<
 *     !fireauth.RpcHandler.ServerError, !fireauth.authenum.Error>}
 */
fireauth.RpcHandler.ServerErrorMap;


/**
 * Firebase Auth response field names.
 * @enum {string}
 */
fireauth.RpcHandler.AuthServerField = {
  ALL_PROVIDERS: 'allProviders',
  AUTH_URI: 'authUri',
  AUTHORIZED_DOMAINS: 'authorizedDomains',
  DYNAMIC_LINKS_DOMAIN: 'dynamicLinksDomain',
  EMAIL: 'email',
  ERROR_MESSAGE: 'errorMessage',
  EXPIRES_IN: 'expiresIn',
  ID_TOKEN: 'idToken',
  NEED_CONFIRMATION: 'needConfirmation',
  RECAPTCHA_SITE_KEY: 'recaptchaSiteKey',
  REFRESH_TOKEN: 'refreshToken',
  SESSION_ID: 'sessionId',
  SESSION_INFO: 'sessionInfo',
  SIGNIN_METHODS: 'signinMethods',
  TEMPORARY_PROOF: 'temporaryProof'
};


/**
 * Firebase Auth getOobConfirmationCode requestType possible values.
 * @enum {string}
 */
fireauth.RpcHandler.GetOobCodeRequestType = {
  EMAIL_SIGNIN: 'EMAIL_SIGNIN',
  NEW_EMAIL_ACCEPT: 'NEW_EMAIL_ACCEPT',
  PASSWORD_RESET: 'PASSWORD_RESET',
  VERIFY_EMAIL: 'VERIFY_EMAIL'
};


/**
 * Firebase Auth response field names.
 * @enum {string}
 */
fireauth.RpcHandler.StsServerField = {
  ACCESS_TOKEN: 'access_token',
  EXPIRES_IN: 'expires_in',
  REFRESH_TOKEN: 'refresh_token'
};


/**
 * @return {string} The API key.
 */
fireauth.RpcHandler.prototype.getApiKey = function() {
  return this.apiKey_;
};


/**
 * The Firebase custom locale header.
 * @const {string}
 * @private
 */
fireauth.RpcHandler.FIREBASE_LOCALE_KEY_ = 'X-Firebase-Locale';


/**
 * The secure token endpoint.
 * @const {string}
 * @private
 */
fireauth.RpcHandler.SECURE_TOKEN_ENDPOINT_ =
    'https://securetoken.googleapis.com/v1/token';


/**
 * The default timeout delay (units in milliseconds) for requests sending to
 *     STS token endpoint.
 * @const {!fireauth.util.Delay}
 * @private
 */
fireauth.RpcHandler.DEFAULT_SECURE_TOKEN_TIMEOUT_ =
    new fireauth.util.Delay(30000, 60000);


/**
 * The STS token RPC content headers.
 * @const {!Object}
 * @private
 */
fireauth.RpcHandler.DEFAULT_SECURE_TOKEN_HEADERS_ = {
  'Content-Type': 'application/x-www-form-urlencoded'
};


/**
 * The Firebase endpoint.
 * @const {string}
 * @private
 */
fireauth.RpcHandler.FIREBASE_ENDPOINT_ =
    'https://www.googleapis.com/identitytoolkit/v3/relyingparty/';


/**
 * The default timeout delay (units in milliseconds) for requests sending to
 *     Firebase endpoint.
 * @const {!fireauth.util.Delay}
 * @private
 */
fireauth.RpcHandler.DEFAULT_FIREBASE_TIMEOUT_ =
    new fireauth.util.Delay(30000, 60000);


/**
 * The Firebase RPC content headers.
 * @const {!Object}
 * @private
 */
fireauth.RpcHandler.DEFAULT_FIREBASE_HEADERS_ = {
  'Content-Type': 'application/json'
};


/**
 * Updates the custom locale header.
 * @param {?string} languageCode The new languageCode.
 */
fireauth.RpcHandler.prototype.updateCustomLocaleHeader =
    function(languageCode) {
  if (languageCode) {
    // If a language code is provided, add it to the header.
    this.firebaseHeaders_[fireauth.RpcHandler.FIREBASE_LOCALE_KEY_] =
        languageCode;
  } else {
    // Otherwise remove the custom locale header.
    delete this.firebaseHeaders_[fireauth.RpcHandler.FIREBASE_LOCALE_KEY_];
  }
};


/**
 * Updates the X-Client-Version in the header.
 * @param {?string} clientVersion The new client version.
 */
fireauth.RpcHandler.prototype.updateClientVersion = function(clientVersion) {
  if (clientVersion) {
    // Update client version for Firebase Auth server.
    this.firebaseHeaders_['X-Client-Version'] = clientVersion;
    // Update client version for securetoken server.
    this.secureTokenHeaders_['X-Client-Version'] = clientVersion;
  } else {
    // Remove client version from header.
    delete this.firebaseHeaders_['X-Client-Version'];
    delete this.secureTokenHeaders_['X-Client-Version'];
  }
};


/**
 * Sends XhrIo request using goog.net.XhrIo.
 * @param {string} url The URL to make a request to.
 * @param {function(?Object)=} opt_callback The callback to run on completion.
 * @param {fireauth.RpcHandler.HttpMethod=} opt_httpMethod The HTTP send method.
 * @param {?ArrayBuffer|?ArrayBufferView|?Blob|?Document|?FormData|string=}
 *     opt_data The request content.
 * @param {?Object=} opt_headers The request content headers.
 * @param {number=} opt_timeout The request timeout.
 * @private
 */
fireauth.RpcHandler.prototype.sendXhr_ = function(
    url,
    opt_callback,
    opt_httpMethod,
    opt_data,
    opt_headers,
    opt_timeout) {
  var sendXhr;
  if (fireauth.util.supportsCors() || fireauth.util.isWorker()) {
    // If supports CORS use goog.net.XhrIo.
    sendXhr = goog.bind(this.sendXhrUsingXhrIo_, this);
  } else {
    // Load gapi.client.request and gapi.auth dependency dynamically.
    if (!fireauth.RpcHandler.loadGApi_) {
      fireauth.RpcHandler.loadGApi_ =
          new goog.Promise(function(resolve, reject) {
            // On load, resolve.
            fireauth.RpcHandler.loadGApiJs_(resolve, reject);
          });
    }
    // If does not support CORS, use gapi.client.request.
    sendXhr = goog.bind(this.sendXhrUsingGApiClient_, this);
  }
  sendXhr(
      url, opt_callback, opt_httpMethod, opt_data, opt_headers, opt_timeout);
};


/**
 * Sends XhrIo request using goog.net.XhrIo.
 * @param {string} url The URL to make a request to.
 * @param {function(?Object)=} opt_callback The callback to run on completion.
 * @param {fireauth.RpcHandler.HttpMethod=} opt_httpMethod The HTTP send method.
 * @param {?ArrayBuffer|?ArrayBufferView|?Blob|?Document|?FormData|string=}
 *     opt_data The request content.
 * @param {?Object=} opt_headers The request content headers.
 * @param {number=} opt_timeout The request timeout.
 * @private
 */
fireauth.RpcHandler.prototype.sendXhrUsingXhrIo_ = function(
    url,
    opt_callback,
    opt_httpMethod,
    opt_data,
    opt_headers,
    opt_timeout) {
  if (fireauth.util.isWorker() && !fireauth.util.isFetchSupported()) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.OPERATION_NOT_SUPPORTED,
        'fetch, Headers and Request native APIs or equivalent Polyfills ' +
        'must be available to support HTTP requests from a Worker ' +
        'environment.');
  }
  var xhrIo = new goog.net.XhrIo(this.rpcHandlerXhrFactory_);

  // xhrIo.setTimeoutInterval not working in IE10 and IE11, handle manually.
  var requestTimeout;
  if (opt_timeout) {
    xhrIo.setTimeoutInterval(opt_timeout);
    requestTimeout = setTimeout(function() {
      xhrIo.dispatchEvent(goog.net.EventType.TIMEOUT);
    }, opt_timeout);
  }
  // Run callback function on completion.
  xhrIo.listen(
      goog.net.EventType.COMPLETE,
      /** @this {goog.net.XhrIo} */
      function() {
        // Clear timeout timer.
        if (requestTimeout) {
          clearTimeout(requestTimeout);
        }
        // Response assumed to be in json format. If not, catch, log error and
        // pass null to callback.
        var response = null;
        try {
          // Do not use this.responseJson() as it uses goog.json.parse
          // underneath. Internal goog.json.parse parsing uses eval and since
          // recommended Content Security Policy does not allow unsafe-eval,
          // this is failing and throwing an error in chrome extensions and
          // warnings else where. Use native parsing instead via JSON.parse.
          response = JSON.parse(this.getResponseText()) || null;
        } catch (e) {
          response = null;
        }
        if (opt_callback) {
          opt_callback(/** @type {?Object} */ (response));
        }
      });
  // Dispose xhrIo on ready.
  xhrIo.listenOnce(
      goog.net.EventType.READY,
      /** @this {goog.net.XhrIo} */
      function() {
        // Clear timeout timer.
        if (requestTimeout) {
          clearTimeout(requestTimeout);
        }
        // Dispose xhrIo.
        this.dispose();
      });
  // Listen to timeout error.
  // This should work when request is aborted too.
  xhrIo.listenOnce(
      goog.net.EventType.TIMEOUT,
      /** @this {goog.net.XhrIo} */
      function() {
        // Clear timeout timer.
        if (requestTimeout) {
          clearTimeout(requestTimeout);
        }
        // Dispose xhrIo.
        this.dispose();
        // The request timed out.
        if (opt_callback) {
          opt_callback(null);
        }
      });
  xhrIo.send(url, opt_httpMethod, opt_data, opt_headers);
};


/**
 * @const {!goog.string.Const} The GApi client library URL.
 * @private
 */
fireauth.RpcHandler.GAPI_SRC_ = goog.string.Const.from(
    'https://apis.google.com/js/client.js?onload=%{onload}');


/**
 * @const {string}
 * @private
 */
fireauth.RpcHandler.GAPI_CALLBACK_NAME_ =
    '__fcb' + Math.floor(Math.random() * 1000000).toString();


/**
 * Loads the GApi client library if it is not loaded.
 * @param {function()} callback The callback to invoke once it's loaded.
 * @param {function(?Object)} errback The error callback.
 * @private
 */
fireauth.RpcHandler.loadGApiJs_ = function(callback, errback) {
  // If gapi.client.request not available, load it dynamically.
  if (!((window['gapi'] || {})['client'] || {})['request']) {
    goog.global[fireauth.RpcHandler.GAPI_CALLBACK_NAME_] = function() {
      // Callback will be called by GApi, test properly loaded here instead of
      // after jsloader resolves.
      if (!((window['gapi'] || {})['client'] || {})['request']) {
        errback(new Error(fireauth.RpcHandler.ServerError.CORS_UNSUPPORTED));
      } else {
        callback();
      }
    };
    var url = goog.html.TrustedResourceUrl.format(
        fireauth.RpcHandler.GAPI_SRC_,
        {'onload': fireauth.RpcHandler.GAPI_CALLBACK_NAME_});
    // TODO: replace goog.net.jsloader with our own script includer.
    var result = goog.net.jsloader.safeLoad(url);
    result.addErrback(function() {
      // In case file fails to load.
      errback(new Error(fireauth.RpcHandler.ServerError.CORS_UNSUPPORTED));
    });
  } else {
    callback();
  }
};


/**
 * Sends XhrIo request using gapi.client.
 * @param {string} url The URL to make a request to.
 * @param {function(?Object)=} opt_callback The callback to run on completion.
 * @param {fireauth.RpcHandler.HttpMethod=} opt_httpMethod The HTTP send method.
 * @param {?ArrayBuffer|?ArrayBufferView|?Blob|?Document|?FormData|string=}
 *     opt_data The request content.
 * @param {?Object=} opt_headers The request content headers.
 * @param {number=} opt_timeout The request timeout.
 * @private
 */
fireauth.RpcHandler.prototype.sendXhrUsingGApiClient_ = function(
    url,
    opt_callback,
    opt_httpMethod,
    opt_data,
    opt_headers,
    opt_timeout) {
  var self = this;
  // Wait for GApi dependency to load.
  fireauth.RpcHandler.loadGApi_.then(function() {
    window['gapi']['client']['setApiKey'](self.getApiKey());
    // GApi maintains the Auth result and automatically append the Auth token to
    // all outgoing requests. Firebase Auth requests will be rejected if there
    // are others scopes (e.g. google plus) for the Auth token. Need to empty
    // the token before call gitkit api. Restored in callback.
    var oauth2Token = window['gapi']['auth']['getToken']();
    window['gapi']['auth']['setToken'](null);
    window['gapi']['client']['request']({
      'path': url,
      'method': opt_httpMethod,
      'body': opt_data,
      'headers': opt_headers,
      // This needs to be set to none, otherwise the access token will be passed
      // in the header field causing apiary to complain.
      'authType': 'none',
      'callback': function(response) {
        window['gapi']['auth']['setToken'](oauth2Token);
        if (opt_callback) {
          opt_callback(response);
        }
      }
    });
  }).thenCatch(function(error) {
    // Catches failure to support CORS and propagates it.
    if (opt_callback) {
      // Simulate backend server error to be caught by upper layer.
      opt_callback({
        'error': {
          'message': (error && error['message']) ||
              fireauth.RpcHandler.ServerError.CORS_UNSUPPORTED
        }
      });
    }
  });
};


/**
 * Validates the request for the STS access token.
 *
 * @param {?Object} data The STS token request body.
 * @return {boolean} Whether the request is valid.
 * @private
 */
fireauth.RpcHandler.prototype.validateStsTokenRequest_ = function(data) {
  if (data['grant_type'] == 'refresh_token' && data['refresh_token']) {
    // Exchange refresh token.
    return true;
  } else if (data['grant_type'] == 'authorization_code' && data['code']) {
    // Exchange ID token.
    return true;
  } else {
    // Invalid.
    return false;
  }
};


/**
 * Handles the request for the STS access token.
 *
 * @param {!Object} data The STS token request body.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.requestStsToken = function(data) {
  var self = this;
  return new goog.Promise(function(resolve, reject) {
    if (self.validateStsTokenRequest_(data)) {
      self.sendXhr_(
          self.secureTokenEndpoint_ + '?key=' +
          encodeURIComponent(self.getApiKey()),
          function(response) {
            if (!response) {
              // An unparseable response from the XHR most likely indicates some
              // problem with the network.
              reject(new fireauth.AuthError(
                  fireauth.authenum.Error.NETWORK_REQUEST_FAILED));
            } else if (fireauth.RpcHandler.hasError_(response)) {
              reject(fireauth.RpcHandler.getDeveloperError_(response));
            } else if (
                !response[fireauth.RpcHandler.StsServerField.ACCESS_TOKEN] ||
                !response[fireauth.RpcHandler.StsServerField.REFRESH_TOKEN]) {
              reject(new fireauth.AuthError(
                  fireauth.authenum.Error.INTERNAL_ERROR));
            } else {
              resolve(response);
            }
          },
          fireauth.RpcHandler.HttpMethod.POST,
          goog.Uri.QueryData.createFromMap(data).toString(),
          self.secureTokenHeaders_,
          self.secureTokenTimeout_.get());
    } else {
      reject(new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR));
    }
  });
};


/**
 * @param {!Object} data The object to serialize.
 * @return {string} The serialized object with null, undefined and empty string
 *     values removed.
 * @private
 */
fireauth.RpcHandler.serialize_ = function(data) {
  // goog.json.serialize converts undefined values to null.
  // This helper removes all empty strings, nulls and undefined from serialized
  // object.
  // Serialize trimmed data.
  return goog.json.serialize(fireauth.util.copyWithoutNullsOrUndefined(data));
};


/**
 * Creates and executes a request for the given API method.
 * @param {string} method The API method.
 * @param {!fireauth.RpcHandler.HttpMethod} httpMethod The http request method.
 * @param {!Object} data The data for the API request. In the case of a GET
 *     request, the contents of this object will be form encoded and appended
 *     to the query string of the URL. No post body is sent in that case. If an
 *     object value is specified, it will be converted to a string:
 *     encodeURIComponent(String(value)).
 * @param {?fireauth.RpcHandler.ServerErrorMap=} opt_customErrorMap A map
 *     of server error codes to client errors to override default error
 *     handling.
 * @param {boolean=} opt_cachebuster Whether to append a unique string to
 *     request to force backend to return an uncached response to request.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.requestFirebaseEndpoint = function(
    method, httpMethod, data, opt_customErrorMap, opt_cachebuster) {
  var self = this;
  // Construct endpoint URL.
  var uri = goog.Uri.parse(this.firebaseEndpoint_ + method);
  uri.setParameterValue('key', this.getApiKey());
  // Check whether to append cachebuster to request.
  if (opt_cachebuster) {
    uri.setParameterValue('cb', goog.now().toString());
  }
  // Firebase allows GET endpoints.
  var isGet = httpMethod == fireauth.RpcHandler.HttpMethod.GET;
  if (isGet) {
    // For GET HTTP method, append data to query string.
    for (var key in data) {
      if (data.hasOwnProperty(key)) {
        uri.setParameterValue(key, data[key]);
      }
    }
  }
  return new goog.Promise(function(resolve, reject) {
    self.sendXhr_(
        uri.toString(),
        function(response) {
          if (!response) {
            // An unparseable response from the XHR most likely indicates some
            // problem with the network.
            reject(new fireauth.AuthError(
                fireauth.authenum.Error.NETWORK_REQUEST_FAILED));
          } else if (fireauth.RpcHandler.hasError_(response)) {
            reject(fireauth.RpcHandler.getDeveloperError_(response,
                opt_customErrorMap || {}));
          } else {
            resolve(response);
          }
        },
        httpMethod,
        // No post body data in GET requests.
        isGet ? undefined : fireauth.RpcHandler.serialize_(data),
        self.firebaseHeaders_,
        self.firebaseTimeout_.get());
  });
};


/**
 * Verifies that the request has a valid email set.
 * @param {!Object} request
 * @private
 */
fireauth.RpcHandler.validateRequestHasEmail_ = function(request) {
  if (!goog.format.EmailAddress.isValidAddrSpec(request['email'])) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INVALID_EMAIL);
  }
};


/**
 * Verifies that the response has a valid email set.
 * @param {!Object} response
 * @private
 */
fireauth.RpcHandler.validateResponseHasEmail_ = function(response) {
  if (!goog.format.EmailAddress.isValidAddrSpec(response['email'])) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
};


/**
 * Verifies that the an email is valid, if it is there.
 * @param {!Object} request
 * @private
 */
fireauth.RpcHandler.validateEmailIfPresent_ = function(request) {
  if ('email' in request) {
    fireauth.RpcHandler.validateRequestHasEmail_(request);
  }
};


/**
 * @param {string} providerId The provider ID.
 * @param {?Array<string>=} opt_additionalScopes The list of scope strings.
 * @return {?string} The IDP and its comma separated scope strings serialized.
 * @private
 */
fireauth.RpcHandler.getAdditionalScopes_ =
    function(providerId, opt_additionalScopes) {
  var scopes = {};
  if (opt_additionalScopes && opt_additionalScopes.length) {
    scopes[providerId] = opt_additionalScopes.join(',');
    // Return stringified scopes.
    return goog.json.serialize(scopes);
  }
  return null;
};


/**
 * Validates a response from getAuthUri.
 * @param {?Object} response The getAuthUri response data.
 * @private
 */
fireauth.RpcHandler.validateGetAuthResponse_ = function(response) {
  if (!response[fireauth.RpcHandler.AuthServerField.AUTH_URI]) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR,
        'Unable to determine the authorization endpoint for the specified '+
        'provider. This may be an issue in the provider configuration.');
  } else if ( !response[fireauth.RpcHandler.AuthServerField.SESSION_ID]) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
};


/**
 * Requests createAuthUri endpoint to retrieve the authUri and session ID for
 * the start of an OAuth handshake.
 * @param {string} providerId The provider ID.
 * @param {string} continueUri The IdP callback URL.
 * @param {?Object=} opt_customParameters The optional OAuth custom parameters
 *     plain object.
 * @param {?Array<string>=} opt_additionalScopes The list of scope strings.
 * @param {?string=} opt_email The optional email.
 * @param {?string=} opt_sessionId The optional session ID.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.getAuthUri = function(
    providerId,
    continueUri,
    opt_customParameters,
    opt_additionalScopes,
    opt_email,
    opt_sessionId) {
  var request = {
    'identifier': opt_email,
    'providerId': providerId,
    'continueUri': continueUri,
    'customParameter': opt_customParameters || {},
    'oauthScope': fireauth.RpcHandler.getAdditionalScopes_(
        providerId, opt_additionalScopes),
    'sessionId': opt_sessionId
  };
  // When sessionId is provided, mobile flow (Cordova) is being used, force
  // code flow and not implicit flow. All other providers use code flow by
  // default.
  if (opt_sessionId && providerId == fireauth.idp.ProviderId.GOOGLE) {
    request['authFlowType'] = 'CODE_FLOW';
  }
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.GET_AUTH_URI,
      request);
};


/**
 * Gets the list of IDPs that can be used to log in for the given identifier.
 * @param {string} identifier The identifier, such as an email address.
 * @return {!goog.Promise<!Array<string>>}
 */
fireauth.RpcHandler.prototype.fetchProvidersForIdentifier =
    function(identifier) {
  // createAuthUri returns an error if continue URI is not http or https.
  // For environments like Cordova, Chrome extensions, native frameworks, file
  // systems, etc, use http://localhost as continue URL.
  var continueUri = fireauth.util.isHttpOrHttps() ?
      fireauth.util.getCurrentUrl() : 'http://localhost';
  var request = {
    'identifier': identifier,
    'continueUri': continueUri
  };
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.CREATE_AUTH_URI, request)
      .then(function(response) {
        return response[fireauth.RpcHandler.AuthServerField.ALL_PROVIDERS] ||
            [];
      });
};


/**
 * Returns the list of sign in methods for the given identifier.
 * @param {string} identifier The identifier, such as an email address.
 * @return {!goog.Promise<!Array<string>>}
 */
fireauth.RpcHandler.prototype.fetchSignInMethodsForIdentifier = function(
    identifier) {
  // createAuthUri returns an error if continue URI is not http or https.
  // For environments like Cordova, Chrome extensions, native frameworks, file
  // systems, etc, use http://localhost as continue URL.
  var continueUri = fireauth.util.isHttpOrHttps() ?
      fireauth.util.getCurrentUrl() :
      'http://localhost';
  var request = {
    'identifier': identifier,
    'continueUri': continueUri
  };
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.CREATE_AUTH_URI, request)
      .then(function(response) {
        return response[fireauth.RpcHandler.AuthServerField.SIGNIN_METHODS] ||
            [];
      });
};


/**
 * Gets the list of authorized domains for the specified project.
 * @return {!goog.Promise<!Array<string>>}
 */
fireauth.RpcHandler.prototype.getAuthorizedDomains = function() {
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.GET_PROJECT_CONFIG, {})
      .then(function(response) {
        return response[
           fireauth.RpcHandler.AuthServerField.AUTHORIZED_DOMAINS] || [];
      });
};


/**
 * Gets the reCAPTCHA parameters needed to render the project's provisioned
 * reCAPTCHA.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.getRecaptchaParam = function() {
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.GET_RECAPTCHA_PARAM, {});
};


/**
 * Gets the list of authorized domains for the specified project.
 * @return {!goog.Promise<string>}
 */
fireauth.RpcHandler.prototype.getDynamicLinkDomain = function() {
  var request = {
    'returnDynamicLink': true
  };
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.RETURN_DYNAMIC_LINK, request);
};


/**
 * Checks if the provided iOS bundle ID belongs to the project as specified by
 * the API key.
 * @param {string} iosBundleId  The iOS bundle ID to check.
 * @return {!goog.Promise<void>}
 */
fireauth.RpcHandler.prototype.isIosBundleIdValid = function(iosBundleId) {
  var request = {
    'iosBundleId': iosBundleId
  };
  // This will either resolve if the identifier is valid or throw INVALID_APP_ID
  // if not.
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.GET_PROJECT_CONFIG, request)
      .then(function(result) {
        // Do not return anything.
      });
};


/**
 * Checks if the provided Android package name belongs to the project as
 * specified by the API key.
 * @param {string} androidPackageName  The iOS bundle ID to check.
 * @param {?string=} opt_sha1Cert The optional SHA-1 Android cert to check.
 * @return {!goog.Promise<void>}
 */
fireauth.RpcHandler.prototype.isAndroidPackageNameValid =
    function(androidPackageName, opt_sha1Cert) {
  var request = {
    'androidPackageName': androidPackageName
  };
  // This is relevant for the native Android SDK flow.
  // This will redirect to an FDL domain owned by GMScore instead of
  // the developer's FDL domain as is done for Cordova apps.
  if (!!opt_sha1Cert) {
    request['sha1Cert'] = opt_sha1Cert;
  }
  // When no sha1Cert is passed, this will either resolve if the identifier is
  // valid or throw INVALID_APP_ID if not.
  // When sha1Cert is also passed, this will either resolve or fail with an
  // INVALID_CERT_HASH error.
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.GET_PROJECT_CONFIG, request)
      .then(function(result) {
        // Do not return anything.
      });
};


/**
 * Checks if the provided OAuth client ID belongs to the project as specified by
 * the API key.
 * @param {string} clientId The OAuth client ID to check.
 * @return {!goog.Promise<void>}
 */
fireauth.RpcHandler.prototype.isOAuthClientIdValid = function(clientId) {
  var request = {
    'clientId': clientId
  };
  // This will either resolve if the client ID is valid or throw
  // INVALID_OAUTH_CLIENT_ID if not.
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.GET_PROJECT_CONFIG, request)
      .then(function(result) {
        // Do not return anything.
      });
};


/**
 * Requests getAccountInfo endpoint using an ID token.
 * @param {string} idToken The ID token.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.getAccountInfoByIdToken = function(idToken) {
  var request = {'idToken': idToken};
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.GET_ACCOUNT_INFO,
      request);
};


/**
 * Validates a request to sign in with email and password.
 * @param {!Object} request
 * @private
 */
fireauth.RpcHandler.validateVerifyCustomTokenRequest_ = function(request) {
  if (!request['token']) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INVALID_CUSTOM_TOKEN);
  }
};


/**
 * Verifies a custom token and returns a Promise that resolves with the ID
 * token.
 * @param {string} token The custom token.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.verifyCustomToken = function(token) {
  var request = {'token': token};
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.VERIFY_CUSTOM_TOKEN,
      request);
};


/**
 * Validates a request to sign in with email and password.
 * @param {!Object} request
 * @private
 */
fireauth.RpcHandler.validateVerifyPasswordRequest_ = function(request) {
  fireauth.RpcHandler.validateRequestHasEmail_(request);
  if (!request['password']) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INVALID_PASSWORD);
  }
};


/**
 * Verifies a password and returns a Promise that resolves with the ID
 * token.
 * @param {string} email The email address.
 * @param {string} password The entered password.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.verifyPassword = function(email, password) {
  var request = {
    'email': email,
    'password': password
  };
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.VERIFY_PASSWORD,
      request);
};


/**
 * Verifies an email link OTP for sign-in and returns a Promise that resolves
 * with the ID token.
 * @param {string} email The email address.
 * @param {string} oobCode The email action OTP.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.emailLinkSignIn = function(email, oobCode) {
  var request = {
    'email': email,
    'oobCode': oobCode
  };
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.EMAIL_LINK_SIGNIN, request);
};


/**
 * Verifies an email link OTP for linking and returns a Promise that resolves
 * with the ID token.
 * @param {string} idToken The ID token.
 * @param {string} email The email address.
 * @param {string} oobCode The email action OTP.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.emailLinkSignInForLinking =
    function(idToken, email, oobCode) {
  var request = {
    'idToken': idToken,
    'email': email,
    'oobCode': oobCode
  };
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.EMAIL_LINK_SIGNIN_FOR_LINKING,
      request);
};


/**
 * Validates a response that should contain an ID token.
 * @param {?Object} response The server response data.
 * @private
 */
fireauth.RpcHandler.validateIdTokenResponse_ = function(response) {
  if (!response[fireauth.RpcHandler.AuthServerField.ID_TOKEN]) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
};


/**
 * Validates a getRecaptchaParam response.
 * @param {?Object} response The server response data.
 * @private
 */
fireauth.RpcHandler.validateGetRecaptchaParamResponse_ = function(response) {
  // Both are required. This could change though.
  if (!response[fireauth.RpcHandler.AuthServerField.RECAPTCHA_SITE_KEY]) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
};


/**
 * Validates a request that sends the verification ID and code for a sign in/up
 * phone Auth flow.
 * @param {!Object} request The server request object.
 * @private
 */
fireauth.RpcHandler.validateVerifyPhoneNumberRequest_ = function(request) {
  // There are 2 cases here:
  // case 1: sessionInfo and code
  // case 2: phoneNumber and temporaryProof
  if (request['phoneNumber'] || request['temporaryProof']) {
    // Case 2. Both phoneNumber and temporaryProof should be set.
    if (!request['phoneNumber'] || !request['temporaryProof']) {
      throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
    }
  } else {
    // Otherwise it's case 1, so we expect sessionInfo and code.
    if (!request['sessionInfo']) {
      throw new fireauth.AuthError(
          fireauth.authenum.Error.MISSING_SESSION_INFO);
    }
    if (!request['code']) {
      throw new fireauth.AuthError(fireauth.authenum.Error.MISSING_CODE);
    }
  }
};


/**
 * Validates a request that sends the verification ID and code for a link/update
 * phone Auth flow.
 * @param {!Object} request The server request object.
 * @private
 */
fireauth.RpcHandler.validateVerifyPhoneNumberLinkRequest_ = function(request) {
  // idToken should be required here.
  if (!request['idToken']) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
  // The other request parameters match the sign in flow.
  fireauth.RpcHandler.validateVerifyPhoneNumberRequest_(request);
};


/**
 * Validates a request to create an email and password account.
 * @param {!Object} request
 * @private
 */
fireauth.RpcHandler.validateCreateAccountRequest_ = function(request) {
  fireauth.RpcHandler.validateRequestHasEmail_(request);
  if (!request['password']) {
    throw new fireauth.AuthError(fireauth.authenum.Error.WEAK_PASSWORD);
  }
};


/**
 * Creates an email/password account. Returns a Promise that resolves with the
 * ID token.
 * @param {string} email The email address of the account.
 * @param {string} password The password.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.createAccount = function(email, password) {
  var request = {
    'email': email,
    'password': password
  };
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.CREATE_ACCOUNT,
      request);
};


/**
 * Signs in a user as anonymous. Returns a Promise that resolves with the
 * ID token.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.signInAnonymously = function() {
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.SIGN_IN_ANONYMOUSLY, {});
};


/**
 * Deletes the user's account corresponding to the idToken given.
 * @param {string} idToken The idToken of the user.
 * @return {!goog.Promise<undefined>}
 */
fireauth.RpcHandler.prototype.deleteAccount = function(idToken) {
  var request = {
    'idToken': idToken
  };
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.DELETE_ACCOUNT,
      request);
};


/**
 * Requests setAccountInfo endpoint for updateEmail operation.
 * @param {string} idToken The ID token.
 * @param {string} newEmail The new email.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.updateEmail = function(idToken, newEmail) {
  var request = {
    'idToken': idToken,
    'email': newEmail
  };
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.SET_ACCOUNT_INFO,
      request);
};


/**
 * Validates a setAccountInfo request that updates the password.
 * @param {!Object} request
 * @private
 */
fireauth.RpcHandler.validateSetAccountInfoSensitive_ = function(request) {
  fireauth.RpcHandler.validateEmailIfPresent_(request);
  if (!request['password']) {
    throw new fireauth.AuthError(fireauth.authenum.Error.WEAK_PASSWORD);
  }
};


/**
 * Requests setAccountInfo endpoint for updatePassword operation.
 * @param {string} idToken The ID token.
 * @param {string} newPassword The new password.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.updatePassword = function(idToken, newPassword) {
  var request = {
    'idToken': idToken,
    'password': newPassword
  };
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.SET_ACCOUNT_INFO_SENSITIVE, request);
};


/**
 * Requests setAccountInfo endpoint to set the email and password. This can be
 * used to link an existing account to a new email and password account.
 * @param {string} idToken The ID token.
 * @param {string} newEmail The new email.
 * @param {string} newPassword The new password.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.updateEmailAndPassword = function(idToken,
    newEmail, newPassword) {
  var request = {
    'idToken': idToken,
    'email': newEmail,
    'password': newPassword
  };
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.SET_ACCOUNT_INFO_SENSITIVE, request);
};


/**
 * Maps the name of a field in the account info object to the backend enum
 * value, for deletion of profile fields.
 * @private {!Object<string, string>}
 */
fireauth.RpcHandler.PROFILE_FIELD_TO_ENUM_NAME_ = {
  'displayName': 'DISPLAY_NAME',
  'photoUrl': 'PHOTO_URL'
};


/**
 * Updates the profile of the user. When resolved, promise returns a response
 * similar to that of getAccountInfo.
 * @param {string} idToken The ID token of the user whose profile is changing.
 * @param {!Object} profileData The new profile data.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.updateProfile = function(idToken, profileData) {
  var data = {
    'idToken': idToken
  };
  var fieldsToDelete = [];

  // Copy over the relevant fields from profileData, or explicitly flag a field
  // for deletion if null is passed as the value. Note that this currently only
  // checks profileData to the first level.
  goog.object.forEach(fireauth.RpcHandler.PROFILE_FIELD_TO_ENUM_NAME_,
      function(enumName, fieldName) {
        var fieldValue = profileData[fieldName];
        if (fieldValue === null) {
          // If null is explicitly provided, delete the field.
          fieldsToDelete.push(enumName);
        } else if (fieldName in profileData) {
          // If the field is explicitly set, send it to the backend.
          data[fieldName] = fieldValue;
        }
      });
  if (fieldsToDelete.length) {
    data['deleteAttribute'] = fieldsToDelete;
  }
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.SET_ACCOUNT_INFO, data);
};


/**
 * Validates a request for an email action code for password reset.
 * @param {!Object} request The getOobCode request data for password reset.
 * @private
 */
fireauth.RpcHandler.validateOobCodeRequest_ = function(request) {
  if (request['requestType'] !=
          fireauth.RpcHandler.GetOobCodeRequestType.PASSWORD_RESET) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
  fireauth.RpcHandler.validateRequestHasEmail_(request);
};


/**
 * Validates a request for an email action for passwordless email sign-in.
 * @param {!Object} request The getOobCode request data for email sign-in.
 * @private
 */
fireauth.RpcHandler.validateEmailSignInCodeRequest_ = function(request) {
  if (request['requestType'] !=
      fireauth.RpcHandler.GetOobCodeRequestType.EMAIL_SIGNIN) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
  fireauth.RpcHandler.validateRequestHasEmail_(request);
};


/**
 * Validates a request for an email action for email verification.
 * @param {!Object} request The getOobCode request data for email verification.
 * @private
 */
fireauth.RpcHandler.validateEmailVerificationCodeRequest_ = function(request) {
  if (request['requestType'] !=
          fireauth.RpcHandler.GetOobCodeRequestType.VERIFY_EMAIL) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
};


/**
 * Requests getOobCode endpoint for password reset, returns promise that
 * resolves with user's email.
 * @param {string} email The email account with the password to be reset.
 * @param {!Object} additionalRequestData Additional data to add to the request.
 * @return {!goog.Promise<string>}
 */
fireauth.RpcHandler.prototype.sendPasswordResetEmail =
    function(email, additionalRequestData) {
  var request = {
    'requestType': fireauth.RpcHandler.GetOobCodeRequestType.PASSWORD_RESET,
    'email': email
  };
  // Extend the original request with the additional data.
  goog.object.extend(request, additionalRequestData);
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.GET_OOB_CODE, request);
};


/**
 * Requests getOobCode endpoint for passwordless email sign-in, returns promise
 * that resolves with user's email.
 * @param {string} email The email account to sign in with.
 * @param {!Object} additionalRequestData Additional data to add to the request.
 * @return {!goog.Promise<string>}
 */
fireauth.RpcHandler.prototype.sendSignInLinkToEmail = function(
    email, additionalRequestData) {
  var request = {
    'requestType': fireauth.RpcHandler.GetOobCodeRequestType.EMAIL_SIGNIN,
    'email': email
  };
  // Extend the original request with the additional data.
  goog.object.extend(request, additionalRequestData);
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.GET_EMAIL_SIGNIN_CODE, request);
};


/**
 * Requests getOobCode endpoint for email verification, returns promise that
 * resolves with user's email.
 * @param {string} idToken The idToken of the user confirming his email.
 * @param {!Object} additionalRequestData Additional data to add to the request.
 * @return {!goog.Promise<string>}
 */
fireauth.RpcHandler.prototype.sendEmailVerification =
    function(idToken, additionalRequestData) {
  var request = {
    'requestType': fireauth.RpcHandler.GetOobCodeRequestType.VERIFY_EMAIL,
    'idToken': idToken
  };
  // Extend the original request with the additional data.
  goog.object.extend(request, additionalRequestData);
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.GET_EMAIL_VERIFICATION_CODE, request);
};


/**
 * Requests sendVerificationCode endpoint for verifying the user's ownership of
 * a phone number. It resolves with a sessionInfo (verificationId).
 * @param {!Object} request The verification request which contains a phone
 *     number and an assertion.
 * @return {!goog.Promise<string>}
 */
fireauth.RpcHandler.prototype.sendVerificationCode = function(request) {
  // In the future, we could support other types of assertions so for now,
  // we are keeping the request an object.
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.SEND_VERIFICATION_CODE, request);
};


/**
 * Requests verifyPhoneNumber endpoint for sign in/sign up phone number
 * authentication flow and resolves with the STS token response.
 * @param {!Object} request The phone number ID and code to exchange for a
 *     Firebase Auth session.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.verifyPhoneNumber = function(request) {
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.VERIFY_PHONE_NUMBER, request);
};


/**
 * Requests verifyPhoneNumber endpoint for link/update phone number
 * authentication flow and resolves with the STS token response.
 * @param {!Object} request The phone number ID and code to exchange for a
 *     Firebase Auth session.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.verifyPhoneNumberForLinking = function(request) {
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.VERIFY_PHONE_NUMBER_FOR_LINKING, request);
};


/**
 * Validates a response to a phone number linking request.
 * @param {?Object} response The server response data.
 * @private
 */
fireauth.RpcHandler.validateVerifyPhoneNumberForLinkingResponse_ =
    function(response) {
  if (response[fireauth.RpcHandler.AuthServerField.TEMPORARY_PROOF]) {
    response['code'] = fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE;
    throw fireauth.AuthErrorWithCredential.fromPlainObject(response);
  }

  // If there's no temporary proof, then we expect the request to have
  // succeeded and returned an ID token.
  fireauth.RpcHandler.validateIdTokenResponse_(response);
};


/**
 * Requests verifyPhoneNumber endpoint for reauthenticating with a phone number
 * and resolves with the STS token response.
 * @param {!Object} request The phone number ID, code, and current ID token to
 *     exchange for a refreshed Firebase Auth session.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.verifyPhoneNumberForExisting = function(request) {
  request['operation'] = 'REAUTH';
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.VERIFY_PHONE_NUMBER_FOR_EXISTING,
      request);
};


/**
 * The custom error map for reauth with verifyPhoneNumber.
 * @private {!fireauth.RpcHandler.ServerErrorMap}
 */
fireauth.RpcHandler.verifyPhoneNumberForExistingErrorMap_ = {};

// For most RPCs, the backend error USER_NOT_FOUND means that the sent STS
// token is invalid. However, for this specific case, USER_NOT_FOUND actually
// means that the sent credential is invalid.
fireauth.RpcHandler.verifyPhoneNumberForExistingErrorMap_[
  fireauth.RpcHandler.ServerError.USER_NOT_FOUND] =
    fireauth.authenum.Error.USER_DELETED;


/**
 * Validates a request to deleteLinkedAccounts.
 * @param {?Object} request
 * @private
 */
fireauth.RpcHandler.validateDeleteLinkedAccountsRequest_ = function(request) {
  if (!goog.isArray(request['deleteProvider'])) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
};


/**
 * Updates the providers for the account associated with the idToken.
 * @param {string} idToken The ID token.
 * @param {!Array<string>} providersToDelete The array of providers to delete.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.deleteLinkedAccounts =
    function(idToken, providersToDelete) {
  var request = {
    'idToken': idToken,
    'deleteProvider': providersToDelete
  };
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.DELETE_LINKED_ACCOUNTS,
      request);
};


/**
 * Validates a verifyAssertion request.
 * @param {?Object} request The verifyAssertion request data.
 * @private
 */
fireauth.RpcHandler.validateVerifyAssertionRequest_ = function(request) {
  // Either (requestUri and sessionId) or (requestUri and postBody) are
  // required.
  if (!request['requestUri'] ||
      (!request['sessionId'] && !request['postBody'])) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
};


/**
 * Validates a response from verifyAssertionForExisting.
 * @param {?Object} response The verifyAssertionForExisting response data.
 * @private
 */
fireauth.RpcHandler.validateVerifyAssertionForExistingResponse_ =
    function(response) {
  // When returnIdpCredential is set to true and the account is new, no error
  // is thrown but an errorMessage is added to the response. No idToken is
  // passed.
  if (response[fireauth.RpcHandler.AuthServerField.ERROR_MESSAGE] &&
      response[fireauth.RpcHandler.AuthServerField.ERROR_MESSAGE] ==
          fireauth.RpcHandler.ServerError.USER_NOT_FOUND) {
    // This corresponds to user-not-found.
    throw new fireauth.AuthError(fireauth.authenum.Error.USER_DELETED);
  } else if (response[fireauth.RpcHandler.AuthServerField.ERROR_MESSAGE]) {
    // Construct developer facing error message from server code in errorMessage
    // field.
    throw fireauth.RpcHandler.getDeveloperErrorFromCode_(
        response[fireauth.RpcHandler.AuthServerField.ERROR_MESSAGE]);
  }
  // Need confirmation should not be returned when do not create new user flag
  // is set.
  // If no error found and ID token is missing, throw an internal error.
  if (!response[fireauth.RpcHandler.AuthServerField.ID_TOKEN]) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
};


/**
 * Validates a response from verifyAssertion.
 * @param {?Object} response The verifyAssertion response data.
 * @private
 */
fireauth.RpcHandler.validateVerifyAssertionResponse_ = function(response) {
  var error = null;
  if (response[fireauth.RpcHandler.AuthServerField.NEED_CONFIRMATION]) {
    // Account linking required, previously logged in to another account
    // with same email. User must authenticate they are owners of the
    // first account.
    // If enough info for Auth linking error, throw an instance of Auth linking
    // error. This will be used by developer after reauthenticating with email
    // provided by error to link using the credentials in Auth linking error.
    // If missing information, return regular Auth error.
    response['code'] = fireauth.authenum.Error.NEED_CONFIRMATION;
    error = fireauth.AuthErrorWithCredential.fromPlainObject(response);
  } else if (response[fireauth.RpcHandler.AuthServerField.ERROR_MESSAGE] ==
             fireauth.RpcHandler.ServerError.FEDERATED_USER_ID_ALREADY_LINKED) {
    // When FEDERATED_USER_ID_ALREADY_LINKED returned in error message, auth
    // credential and email will also be returned, throw relevant error in that
    // case.
    // In this case the developer needs to signInWithCredential to the returned
    // credentials.
    response['code'] = fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE;
    error = fireauth.AuthErrorWithCredential.fromPlainObject(response);
  } else if (response[fireauth.RpcHandler.AuthServerField.ERROR_MESSAGE] ==
             fireauth.RpcHandler.ServerError.EMAIL_EXISTS) {
    // When EMAIL_EXISTS returned in error message, Auth credential and email
    // will also be returned, throw relevant error in that case.
    // In this case, the developers needs to sign in the user to the original
    // owner of the account and then link to the returned credential here.
    response['code'] = fireauth.authenum.Error.EMAIL_EXISTS;
    error = fireauth.AuthErrorWithCredential.fromPlainObject(response);
  } else if (response[fireauth.RpcHandler.AuthServerField.ERROR_MESSAGE]) {
    // Construct developer facing error message from server code in errorMessage
    // field.
    error = fireauth.RpcHandler.getDeveloperErrorFromCode_(
        response[fireauth.RpcHandler.AuthServerField.ERROR_MESSAGE]);
  }
  // If error found, throw it.
  if (error) {
    throw error;
  }
  // If no error found and ID token is missing, throw an internal error.
  if (!response[fireauth.RpcHandler.AuthServerField.ID_TOKEN]) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
};


/**
 * Validates a verifyAssertion with linking request.
 * @param {?Object} request The verifyAssertion request data.
 * @private
 */
fireauth.RpcHandler.validateVerifyAssertionLinkRequest_ = function(request) {
  // idToken with either (requestUri and sessionId) or (requestUri and postBody)
  // are required.
  fireauth.RpcHandler.validateVerifyAssertionRequest_(request);
  if (!request['idToken']) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
};


/**
 * @typedef {{
 *   autoCreate: (boolean|undefined),
 *   requestUri: string,
 *   postBody: (?string|undefined),
 *   pendingIdToken: (?string|undefined),
 *   sessionId: (?string|undefined),
 *   idToken: (?string|undefined),
 *   returnIdpCredential: (boolean|undefined)
 * }}
 */
fireauth.RpcHandler.VerifyAssertionData;


/**
 * Requests verifyAssertion endpoint. When resolved, promise returns the whole
 * response.
 * @param {!fireauth.RpcHandler.VerifyAssertionData} request
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.verifyAssertion = function(request) {
  // Force Auth credential to be returned on the following errors:
  // FEDERATED_USER_ID_ALREADY_LINKED
  // EMAIL_EXISTS
  request['returnIdpCredential'] = true;
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.VERIFY_ASSERTION,
      request);
};


/**
 * Requests verifyAssertion endpoint for federated account linking. When
 * resolved, promise returns the whole response.
 * @param {!fireauth.RpcHandler.VerifyAssertionData} request
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.verifyAssertionForLinking = function(request) {
  // Force Auth credential to be returned on the following errors:
  // FEDERATED_USER_ID_ALREADY_LINKED
  // EMAIL_EXISTS
  request['returnIdpCredential'] = true;
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.VERIFY_ASSERTION_FOR_LINKING,
      request);
};


/**
 * Requests verifyAssertion endpoint for an existing federated account. When
 * resolved, promise returns the whole response. If not existing, a
 * user-not-found error is thrown.
 * @param {!fireauth.RpcHandler.VerifyAssertionData} request
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.verifyAssertionForExisting = function(request) {
  // Since we are setting returnIdpCredential to true, a response will be
  // returned even though the account doesn't exist but an error message is
  // appended with value set to USER_NOT_FOUND. If this flag is not passed, only
  // the USER_NOT_FOUND error is thrown without any response.
  request['returnIdpCredential'] = true;
  // Do not create a new account if the user doesn't exist.
  request['autoCreate'] = false;
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.VERIFY_ASSERTION_FOR_EXISTING,
      request);
};


/**
 * Validates a request that should contain an action code.
 * @param {!Object} request
 * @private
 */
fireauth.RpcHandler.validateApplyActionCodeRequest_ = function(request) {
  if (!request['oobCode']) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INVALID_OOB_CODE);
  }
};


/**
 * Validates that a checkActionCode response contains the email and requestType
 * fields.
 * @param {!Object} response The raw response returned by the server.
 * @private
 */
fireauth.RpcHandler.validateCheckActionCodeResponse_ = function(response) {
  // If the code is invalid, usually a clear error would be returned.
  // In this case, something unexpected happened.
  // Email could be empty only if the request type is EMAIL_SIGNIN.
  var operation = response['requestType'];
  if (!operation || (!response['email'] && operation != 'EMAIL_SIGNIN')) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR);
  }
};


/**
 * Requests resetPassword endpoint for password reset, returns promise that
 * resolves with user's email.
 * @param {string} code The email action code to confirm for password reset.
 * @param {string} newPassword The new password.
 * @return {!goog.Promise<string>}
 */
fireauth.RpcHandler.prototype.confirmPasswordReset =
    function(code, newPassword) {
  var request = {
    'oobCode': code,
    'newPassword': newPassword
  };
  return this.invokeRpc_(fireauth.RpcHandler.ApiMethod.RESET_PASSWORD, request);
};


/**
 * Checks the validity of an email action code and returns the response
 * received.
 * @param {string} code The email action code to check.
 * @return {!goog.Promise<!Object>}
 */
fireauth.RpcHandler.prototype.checkActionCode = function(code) {
  var request = {
    'oobCode': code
  };
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.CHECK_ACTION_CODE, request);
};


/**
 * Applies an out-of-band email action code, such as an email verification code.
 * @param {string} code The email action code.
 * @return {!goog.Promise<string>} A promise that resolves with the user's
 *     email.
 */
fireauth.RpcHandler.prototype.applyActionCode = function(code) {
  var request = {
    'oobCode': code
  };
  return this.invokeRpc_(
      fireauth.RpcHandler.ApiMethod.APPLY_OOB_CODE, request);
};


/**
 * The specification of an RPC call. The fields are:
 * <ul>
 * <li>cachebuster: defines whether to send a unique string with request to
 *     force the backend to return an uncached response to request.
 * <li>customErrorMap: A map of backend error codes to client-side errors.
 *     Any entries set here override the default handling of the backend error
 *     code.
 * <li>endpoint: defines the backend endpoint to call.
 * <li>httpMethod: defines the HTTP method to use, defaulting to POST if not
 *     specified.
 * <li>requestRequiredFields: an array of the fields that are required in the
 *     request. The RPC call will fail with an INTERNAL_ERROR error if a
 *     required field is not present or if it is null, undefined, or the empty
 *     string.
 * <li>requestValidator: a function that takes in the request object and throws
 *     an error if the request is invalid.
 * <li>responseValidator: a function that takes in the response object and
 *     throws an error if the response is invalid.
 * <li>responseField: the field of the response object that will be returned
 *     from the RPC call. If no field is specified, the entire response object
 *     will be returned.
 * <li>returnSecureToken: Set to true to explicitly request STS tokens instead
 *     of legacy Google Identity Toolkit tokens from the backend.
 * </ul>
 * @typedef {{
 *   cachebuster: (boolean|undefined),
 *   customErrorMap: (!fireauth.RpcHandler.ServerErrorMap|undefined),
 *   endpoint: string,
 *   httpMethod: (!fireauth.RpcHandler.HttpMethod|undefined),
 *   requestRequiredFields: (!Array<string>|undefined),
 *   requestValidator: (function(!Object):void|undefined),
 *   responseValidator: (function(!Object):void|undefined),
 *   responseField: (string|undefined),
 *   returnSecureToken: (boolean|undefined)
 * }}
 */
fireauth.RpcHandler.ApiMethodHandler;


/**
 * The specifications for the backend API methods.
 * @enum {!fireauth.RpcHandler.ApiMethodHandler}
 */
fireauth.RpcHandler.ApiMethod = {
  APPLY_OOB_CODE: {
    endpoint: 'setAccountInfo',
    requestValidator: fireauth.RpcHandler.validateApplyActionCodeRequest_,
    responseField: fireauth.RpcHandler.AuthServerField.EMAIL
  },
  CHECK_ACTION_CODE: {
    endpoint: 'resetPassword',
    requestValidator: fireauth.RpcHandler.validateApplyActionCodeRequest_,
    responseValidator: fireauth.RpcHandler.validateCheckActionCodeResponse_
  },
  CREATE_ACCOUNT: {
    endpoint: 'signupNewUser',
    requestValidator: fireauth.RpcHandler.validateCreateAccountRequest_,
    responseValidator: fireauth.RpcHandler.validateIdTokenResponse_,
    returnSecureToken: true
  },
  CREATE_AUTH_URI: {
    endpoint: 'createAuthUri'
  },
  DELETE_ACCOUNT: {
    endpoint: 'deleteAccount',
    requestRequiredFields: ['idToken']
  },
  DELETE_LINKED_ACCOUNTS: {
    endpoint: 'setAccountInfo',
    requestRequiredFields: ['idToken', 'deleteProvider'],
    requestValidator: fireauth.RpcHandler.validateDeleteLinkedAccountsRequest_
  },
  EMAIL_LINK_SIGNIN: {
    endpoint: 'emailLinkSignin',
    requestRequiredFields: ['email', 'oobCode'],
    requestValidator: fireauth.RpcHandler.validateRequestHasEmail_,
    responseValidator: fireauth.RpcHandler.validateIdTokenResponse_,
    returnSecureToken: true
  },
  EMAIL_LINK_SIGNIN_FOR_LINKING: {
    endpoint: 'emailLinkSignin',
    requestRequiredFields: ['idToken', 'email', 'oobCode'],
    requestValidator: fireauth.RpcHandler.validateRequestHasEmail_,
    responseValidator: fireauth.RpcHandler.validateIdTokenResponse_,
    returnSecureToken: true
  },
  GET_ACCOUNT_INFO: {
    endpoint: 'getAccountInfo'
  },
  GET_AUTH_URI: {
    endpoint: 'createAuthUri',
    requestRequiredFields: ['continueUri', 'providerId'],
    responseValidator: fireauth.RpcHandler.validateGetAuthResponse_
  },
  GET_EMAIL_SIGNIN_CODE: {
    endpoint: 'getOobConfirmationCode',
    requestRequiredFields: ['requestType'],
    requestValidator: fireauth.RpcHandler.validateEmailSignInCodeRequest_,
    responseField: fireauth.RpcHandler.AuthServerField.EMAIL
  },
  GET_EMAIL_VERIFICATION_CODE: {
    endpoint: 'getOobConfirmationCode',
    requestRequiredFields: ['idToken', 'requestType'],
    requestValidator: fireauth.RpcHandler.validateEmailVerificationCodeRequest_,
    responseField: fireauth.RpcHandler.AuthServerField.EMAIL
  },
  GET_OOB_CODE: {
    endpoint: 'getOobConfirmationCode',
    requestRequiredFields: ['requestType'],
    requestValidator: fireauth.RpcHandler.validateOobCodeRequest_,
    responseField: fireauth.RpcHandler.AuthServerField.EMAIL
  },
  GET_PROJECT_CONFIG: {
    // Microsoft edge caching bug. There are two getProjectConfig API calls,
    // first from top level window and then from iframe. The second call has a
    // response of 304 which means it's a cached response. We suspect the call
    // from iframe is reusing the response from the first call and checks the
    // allowed origin in the cached response, which only contains the domain for
    // the top level window.
    cachebuster: true,
    endpoint: 'getProjectConfig',
    httpMethod: fireauth.RpcHandler.HttpMethod.GET
  },
  GET_RECAPTCHA_PARAM: {
    cachebuster: true,
    endpoint: 'getRecaptchaParam',
    httpMethod: fireauth.RpcHandler.HttpMethod.GET,
    responseValidator: fireauth.RpcHandler.validateGetRecaptchaParamResponse_
  },
  RESET_PASSWORD: {
    endpoint: 'resetPassword',
    requestValidator: fireauth.RpcHandler.validateApplyActionCodeRequest_,
    responseField: fireauth.RpcHandler.AuthServerField.EMAIL
  },
  RETURN_DYNAMIC_LINK: {
    cachebuster: true,
    endpoint: 'getProjectConfig',
    httpMethod: fireauth.RpcHandler.HttpMethod.GET,
    responseField: fireauth.RpcHandler.AuthServerField.DYNAMIC_LINKS_DOMAIN
  },
  SEND_VERIFICATION_CODE: {
    endpoint: 'sendVerificationCode',
    // Currently only reCAPTCHA tokens supported.
    requestRequiredFields: ['phoneNumber', 'recaptchaToken'],
    responseField: fireauth.RpcHandler.AuthServerField.SESSION_INFO
  },
  SET_ACCOUNT_INFO: {
    endpoint: 'setAccountInfo',
    requestRequiredFields: ['idToken'],
    requestValidator: fireauth.RpcHandler.validateEmailIfPresent_,
    returnSecureToken: true // Maybe updating email will invalidate token in the
                            // future, this will prevent breaking the client.
  },
  SET_ACCOUNT_INFO_SENSITIVE: {
    endpoint: 'setAccountInfo',
    requestRequiredFields: ['idToken'],
    requestValidator: fireauth.RpcHandler.validateSetAccountInfoSensitive_,
    responseValidator: fireauth.RpcHandler.validateIdTokenResponse_,
    returnSecureToken: true // Updating password will send back new sts tokens.
  },
  SIGN_IN_ANONYMOUSLY: {
    endpoint: 'signupNewUser',
    responseValidator: fireauth.RpcHandler.validateIdTokenResponse_,
    returnSecureToken: true
  },
  VERIFY_ASSERTION: {
    endpoint: 'verifyAssertion',
    requestValidator: fireauth.RpcHandler.validateVerifyAssertionRequest_,
    responseValidator: fireauth.RpcHandler.validateVerifyAssertionResponse_,
    returnSecureToken: true
  },
  VERIFY_ASSERTION_FOR_EXISTING: {
    endpoint: 'verifyAssertion',
    requestValidator: fireauth.RpcHandler.validateVerifyAssertionRequest_,
    responseValidator:
        fireauth.RpcHandler.validateVerifyAssertionForExistingResponse_,
    returnSecureToken: true
  },
  VERIFY_ASSERTION_FOR_LINKING: {
    endpoint: 'verifyAssertion',
    requestValidator: fireauth.RpcHandler.validateVerifyAssertionLinkRequest_,
    responseValidator: fireauth.RpcHandler.validateVerifyAssertionResponse_,
    returnSecureToken: true
  },
  VERIFY_CUSTOM_TOKEN: {
    endpoint: 'verifyCustomToken',
    requestValidator: fireauth.RpcHandler.validateVerifyCustomTokenRequest_,
    responseValidator: fireauth.RpcHandler.validateIdTokenResponse_,
    returnSecureToken: true
  },
  VERIFY_PASSWORD: {
    endpoint: 'verifyPassword',
    requestValidator: fireauth.RpcHandler.validateVerifyPasswordRequest_,
    responseValidator: fireauth.RpcHandler.validateIdTokenResponse_,
    returnSecureToken: true
  },
  VERIFY_PHONE_NUMBER: {
    endpoint: 'verifyPhoneNumber',
    requestValidator: fireauth.RpcHandler.validateVerifyPhoneNumberRequest_,
    responseValidator: fireauth.RpcHandler.validateIdTokenResponse_
  },
  VERIFY_PHONE_NUMBER_FOR_LINKING: {
    endpoint: 'verifyPhoneNumber',
    requestValidator: fireauth.RpcHandler.validateVerifyPhoneNumberLinkRequest_,
    responseValidator:
        fireauth.RpcHandler.validateVerifyPhoneNumberForLinkingResponse_
  },
  VERIFY_PHONE_NUMBER_FOR_EXISTING: {
    customErrorMap: fireauth.RpcHandler.verifyPhoneNumberForExistingErrorMap_,
    endpoint: 'verifyPhoneNumber',
    requestValidator: fireauth.RpcHandler.validateVerifyPhoneNumberRequest_,
    responseValidator: fireauth.RpcHandler.validateIdTokenResponse_
  }
};


/**
 * @const {string} The parameter to send to the backend to specify that the
 *     client accepts STS tokens directly from Firebear backends.
 * @private
 */
fireauth.RpcHandler.USE_STS_TOKEN_PARAM_ = 'returnSecureToken';


/**
 * Invokes an RPC method according to the specification defined by
 * {@code fireauth.RpcHandler.ApiMethod}.
 * @param {!fireauth.RpcHandler.ApiMethod} method The method to invoke.
 * @param {!Object} request The input data to the method.
 * @return {!goog.Promise} A promise that resolves with the results of the RPC.
 *     The format of the results can be modified in
 *     {@code fireauth.RpcHandler.ApiMethod}.
 * @private
 */
fireauth.RpcHandler.prototype.invokeRpc_ = function(method, request) {
  if (!fireauth.object.hasNonEmptyFields(
      request, method.requestRequiredFields)) {
    return goog.Promise.reject(new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR));
  }

  var httpMethod = method.httpMethod || fireauth.RpcHandler.HttpMethod.POST;
  var self = this;
  var response;
  return goog.Promise.resolve(request)
      .then(method.requestValidator)
      .then(function() {
        if (method.returnSecureToken) {
          // Signal that the client accepts STS tokens, for the legacy Google
          // Identity Toolkit token to STS token migration.
          request[fireauth.RpcHandler.USE_STS_TOKEN_PARAM_] = true;
        }
        return self.requestFirebaseEndpoint(method.endpoint, httpMethod,
            request, method.customErrorMap, method.cachebuster || false);
      })
      .then(function(tempResponse) {
        response = tempResponse;
        return response;
      })
      .then(method.responseValidator)
      .then(function() {
        if (!method.responseField) {
          return response;
        }
        if (!(method.responseField in response)) {
          throw new fireauth.AuthError(
              fireauth.authenum.Error.INTERNAL_ERROR);
        }
        return response[method.responseField];
      });
};


/**
 * Checks if the server response contains errors.
 * @param {!Object} resp The API response.
 * @return {boolean} {@code true} if the response contains errors.
 * @private
 */
fireauth.RpcHandler.hasError_ = function(resp) {
  return !!resp['error'];
};


/**
 * Returns the developer facing error corresponding to the server code provided.
 * @param {string} serverErrorCode The server error message.
 * @return {!fireauth.AuthError} The corresponding error object.
 * @private
 */
fireauth.RpcHandler.getDeveloperErrorFromCode_ = function(serverErrorCode) {
  // Encapsulate the server error code in a typical server error response with
  // the code populated within. This will convert the response to a developer
  // facing one.
  return fireauth.RpcHandler.getDeveloperError_({
    'error': {
      'errors': [
        {
          'message': serverErrorCode
        }
      ],
      'code': 400,
      'message': serverErrorCode
    }
  });
};


/**
 * Converts a server response with errors to a developer-facing AuthError.
 * @param {!Object} response The server response.
 * @param {?fireauth.RpcHandler.ServerErrorMap=} opt_customErrorMap A map of
 *     backend error codes to client-side errors. Any entries set here
 *     override the default handling of the backend error code.
 * @return {!fireauth.AuthError} The corresponding error object.
 * @private
 */
fireauth.RpcHandler.getDeveloperError_ =
    function(response, opt_customErrorMap) {
  var errorMessage;
  var apiaryError = fireauth.RpcHandler.getApiaryError_(response);
  if (apiaryError) {
    return apiaryError;
  }

  var serverErrorCode = fireauth.RpcHandler.getErrorCode_(response);

  var errorMap = {};

  // Custom token errors.
  errorMap[fireauth.RpcHandler.ServerError.INVALID_CUSTOM_TOKEN] =
      fireauth.authenum.Error.INVALID_CUSTOM_TOKEN;
  errorMap[fireauth.RpcHandler.ServerError.CREDENTIAL_MISMATCH] =
      fireauth.authenum.Error.CREDENTIAL_MISMATCH;
  // This can only happen if the SDK sends a bad request.
  errorMap[fireauth.RpcHandler.ServerError.MISSING_CUSTOM_TOKEN] =
      fireauth.authenum.Error.INTERNAL_ERROR;

  // Create Auth URI errors.
  errorMap[fireauth.RpcHandler.ServerError.INVALID_IDENTIFIER] =
      fireauth.authenum.Error.INVALID_EMAIL;
  // This can only happen if the SDK sends a bad request.
  errorMap[fireauth.RpcHandler.ServerError.MISSING_CONTINUE_URI] =
      fireauth.authenum.Error.INTERNAL_ERROR;

  // Sign in with email and password errors (some apply to sign up too).
  errorMap[fireauth.RpcHandler.ServerError.INVALID_EMAIL] =
      fireauth.authenum.Error.INVALID_EMAIL;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_PASSWORD] =
      fireauth.authenum.Error.INVALID_PASSWORD;
  errorMap[fireauth.RpcHandler.ServerError.USER_DISABLED] =
      fireauth.authenum.Error.USER_DISABLED;
  // This can only happen if the SDK sends a bad request.
  errorMap[fireauth.RpcHandler.ServerError.MISSING_PASSWORD] =
      fireauth.authenum.Error.INTERNAL_ERROR;

  // Sign up with email and password errors.
  errorMap[fireauth.RpcHandler.ServerError.EMAIL_EXISTS] =
      fireauth.authenum.Error.EMAIL_EXISTS;
  errorMap[fireauth.RpcHandler.ServerError.PASSWORD_LOGIN_DISABLED] =
      fireauth.authenum.Error.OPERATION_NOT_ALLOWED;

  // Verify assertion for sign in with credential errors:
  errorMap[fireauth.RpcHandler.ServerError.INVALID_IDP_RESPONSE] =
      fireauth.authenum.Error.INVALID_IDP_RESPONSE;
  errorMap[fireauth.RpcHandler.ServerError.FEDERATED_USER_ID_ALREADY_LINKED] =
      fireauth.authenum.Error.CREDENTIAL_ALREADY_IN_USE;

  // Email template errors while sending emails:
  errorMap[fireauth.RpcHandler.ServerError.INVALID_MESSAGE_PAYLOAD] =
      fireauth.authenum.Error.INVALID_MESSAGE_PAYLOAD;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_RECIPIENT_EMAIL] =
      fireauth.authenum.Error.INVALID_RECIPIENT_EMAIL;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_SENDER] =
      fireauth.authenum.Error.INVALID_SENDER;

  // Send Password reset email errors:
  errorMap[fireauth.RpcHandler.ServerError.EMAIL_NOT_FOUND] =
      fireauth.authenum.Error.USER_DELETED;

  // Reset password errors:
  errorMap[fireauth.RpcHandler.ServerError.EXPIRED_OOB_CODE] =
      fireauth.authenum.Error.EXPIRED_OOB_CODE;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_OOB_CODE] =
      fireauth.authenum.Error.INVALID_OOB_CODE;
  // This can only happen if the SDK sends a bad request.
  errorMap[fireauth.RpcHandler.ServerError.MISSING_OOB_CODE] =
      fireauth.authenum.Error.INTERNAL_ERROR;

  // Operations that require ID token in request:
  errorMap[fireauth.RpcHandler.ServerError.CREDENTIAL_TOO_OLD_LOGIN_AGAIN] =
      fireauth.authenum.Error.CREDENTIAL_TOO_OLD_LOGIN_AGAIN;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_ID_TOKEN] =
      fireauth.authenum.Error.INVALID_AUTH;
  errorMap[fireauth.RpcHandler.ServerError.TOKEN_EXPIRED] =
      fireauth.authenum.Error.TOKEN_EXPIRED;
  errorMap[fireauth.RpcHandler.ServerError.USER_NOT_FOUND] =
      fireauth.authenum.Error.TOKEN_EXPIRED;

  // CORS issues.
  errorMap[fireauth.RpcHandler.ServerError.CORS_UNSUPPORTED] =
      fireauth.authenum.Error.CORS_UNSUPPORTED;

  // Dynamic link not activated.
  errorMap[fireauth.RpcHandler.ServerError.DYNAMIC_LINK_NOT_ACTIVATED] =
      fireauth.authenum.Error.DYNAMIC_LINK_NOT_ACTIVATED;

  // iosBundleId or androidPackageName not valid error.
  errorMap[fireauth.RpcHandler.ServerError.INVALID_APP_ID] =
      fireauth.authenum.Error.INVALID_APP_ID;

  // Other errors.
  errorMap[fireauth.RpcHandler.ServerError.TOO_MANY_ATTEMPTS_TRY_LATER] =
      fireauth.authenum.Error.TOO_MANY_ATTEMPTS_TRY_LATER;
  errorMap[fireauth.RpcHandler.ServerError.WEAK_PASSWORD] =
      fireauth.authenum.Error.WEAK_PASSWORD;
  errorMap[fireauth.RpcHandler.ServerError.OPERATION_NOT_ALLOWED] =
      fireauth.authenum.Error.OPERATION_NOT_ALLOWED;
  errorMap[fireauth.RpcHandler.ServerError.USER_CANCELLED] =
      fireauth.authenum.Error.USER_CANCELLED;

  // Phone Auth related errors.
  errorMap[fireauth.RpcHandler.ServerError.CAPTCHA_CHECK_FAILED] =
      fireauth.authenum.Error.CAPTCHA_CHECK_FAILED;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_APP_CREDENTIAL] =
      fireauth.authenum.Error.INVALID_APP_CREDENTIAL;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_CODE] =
      fireauth.authenum.Error.INVALID_CODE;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_PHONE_NUMBER] =
      fireauth.authenum.Error.INVALID_PHONE_NUMBER;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_SESSION_INFO] =
      fireauth.authenum.Error.INVALID_SESSION_INFO;
  errorMap[fireauth.RpcHandler.ServerError.INVALID_TEMPORARY_PROOF] =
      fireauth.authenum.Error.INVALID_IDP_RESPONSE;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_APP_CREDENTIAL] =
      fireauth.authenum.Error.MISSING_APP_CREDENTIAL;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_CODE] =
      fireauth.authenum.Error.MISSING_CODE;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_PHONE_NUMBER] =
      fireauth.authenum.Error.MISSING_PHONE_NUMBER;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_SESSION_INFO] =
      fireauth.authenum.Error.MISSING_SESSION_INFO;
  errorMap[fireauth.RpcHandler.ServerError.QUOTA_EXCEEDED] =
      fireauth.authenum.Error.QUOTA_EXCEEDED;
  errorMap[fireauth.RpcHandler.ServerError.SESSION_EXPIRED] =
      fireauth.authenum.Error.CODE_EXPIRED;

  // Other action code errors when additional settings passed.
  errorMap[fireauth.RpcHandler.ServerError.INVALID_CONTINUE_URI] =
      fireauth.authenum.Error.INVALID_CONTINUE_URI;
  // MISSING_CONTINUE_URI is getting mapped to INTERNAL_ERROR above.
  // This is OK as this error will be caught by client side validation.
  errorMap[fireauth.RpcHandler.ServerError.MISSING_ANDROID_PACKAGE_NAME] =
      fireauth.authenum.Error.MISSING_ANDROID_PACKAGE_NAME;
  errorMap[fireauth.RpcHandler.ServerError.MISSING_IOS_BUNDLE_ID] =
      fireauth.authenum.Error.MISSING_IOS_BUNDLE_ID;
  errorMap[fireauth.RpcHandler.ServerError.UNAUTHORIZED_DOMAIN] =
      fireauth.authenum.Error.UNAUTHORIZED_DOMAIN;

  // getProjectConfig errors when clientId is passed.
  errorMap[fireauth.RpcHandler.ServerError.INVALID_OAUTH_CLIENT_ID] =
      fireauth.authenum.Error.INVALID_OAUTH_CLIENT_ID;
  // getProjectConfig errors when sha1Cert is passed.
  errorMap[fireauth.RpcHandler.ServerError.INVALID_CERT_HASH] =
      fireauth.authenum.Error.INVALID_CERT_HASH;

  // Override errors set in the custom map.
  var customErrorMap = opt_customErrorMap || {};
  goog.object.extend(errorMap, customErrorMap);

  // Get detailed message if available.
  errorMessage = fireauth.RpcHandler.getErrorCodeDetails(serverErrorCode);

  // Handle backend errors where the error code can be a prefix of the message
  // (e.g. "WEAK_PASSWORD : Password should be at least 6 characters").
  // Use the details after the colon as the error message. If none available,
  // pass undefined, which will default to the client hard coded error messages.
  for (var prefixCode in errorMap) {
    if (serverErrorCode.indexOf(prefixCode) === 0) {
      return new fireauth.AuthError(errorMap[prefixCode], errorMessage);
    }
  }

  // No error message found, return the serialized response as the message.
  // This is likely to be an Apiary error for unexpected cases like keyExpired,
  // etc.
  if (!errorMessage && response) {
     errorMessage = fireauth.util.stringifyJSON(response);
  }
  // The backend returned some error we don't recognize; this is an error on
  // our side.
  return new fireauth.AuthError(
      fireauth.authenum.Error.INTERNAL_ERROR, errorMessage);
};


/**
 * @param {string} serverMessage The server error code.
 * @return {string|undefined} The detailed error code message.
 */
fireauth.RpcHandler.getErrorCodeDetails = function(serverMessage) {
  // Use the error details part as the autherror message.
  // For a message INVALID_CUSTOM_TOKEN : [error detail here],
  // The Auth error message should be [error detail here].
  // No space should be contained in the error code, otherwise no detailed error
  // message returned.
  var matches = serverMessage.match(/^[^\s]+\s*:\s*(.*)$/);
  if (matches && matches.length > 1) {
    return matches[1];
  }
  return undefined;
};


/**
 * Gets the Apiary error from a backend response, if applicable.
 * @param {!Object} response The API response.
 * @return {?fireauth.AuthError} The error, if applicable.
 * @private
 */
fireauth.RpcHandler.getApiaryError_ = function(response) {
  var error = response['error'] && response['error']['errors'] &&
      response['error']['errors'][0] || {};
  var reason = error['reason'] || '';

  var errorReasonMap = {
    'keyInvalid': fireauth.authenum.Error.INVALID_API_KEY,
    'ipRefererBlocked': fireauth.authenum.Error.APP_NOT_AUTHORIZED
  };

  if (errorReasonMap[reason]) {
    return new fireauth.AuthError(errorReasonMap[reason]);
  }

  return null;
};


/**
 * Gets the server error code from the response.
 * @param {!Object} resp The API response.
 * @return {string} The error code if present.
 * @private
 */
fireauth.RpcHandler.getErrorCode_ = function(resp) {
  return (resp['error'] && resp['error']['message']) || '';
};
