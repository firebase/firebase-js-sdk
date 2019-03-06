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
 * @fileoverview Utility class to retrieve and cache STS token.
 */
goog.provide('fireauth.StsTokenManager');
goog.provide('fireauth.StsTokenManager.Response');
goog.provide('fireauth.StsTokenManager.ResponseData');

goog.require('fireauth.AuthError');
goog.require('fireauth.RpcHandler');
goog.require('fireauth.authenum.Error');
goog.require('goog.Promise');
goog.require('goog.asserts');



/**
 * Creates STS token manager.
 *
 * @param {!fireauth.RpcHandler} rpcHandler Handler for RPC requests.
 * @constructor
 */
fireauth.StsTokenManager = function(rpcHandler) {
  /**
   * @const @private {!fireauth.RpcHandler} The RPC handler used to request STS
   *     tokens.
   */
  this.rpcHandler_ = rpcHandler;
  /** @private {?string} The STS refresh token. */
  this.refreshToken_ = null;
  /** @private {?string} The STS ID token. */
  this.accessToken_ = null;
  /** @private {number} The STS expiration timestamp. */
  this.expirationTime_ = 0;
};


/**
 * @return {!Object} The plain object representation of the STS token manager.
 */
fireauth.StsTokenManager.prototype.toPlainObject = function() {
  return {
    'apiKey': this.rpcHandler_.getApiKey(),
    'refreshToken': this.refreshToken_,
    'accessToken': this.accessToken_,
    'expirationTime': this.expirationTime_
  };
};


/**
 * @param {!fireauth.RpcHandler} rpcHandler The RPC handler for the token
 *     manager.
 * @param {?Object} obj The plain object whose STS token manager instance is to
 *     be returned.
 * @return {?fireauth.StsTokenManager} The STS token manager instance from the
 *     plain object provided using the RPC handler provided.
 */
fireauth.StsTokenManager.fromPlainObject = function(rpcHandler, obj) {
  var stsTokenManager = null;
  if (obj && obj['apiKey']) {
    // These should be always equals and must be enforced in internal use.
    goog.asserts.assert(obj['apiKey'] == rpcHandler.getApiKey());
    stsTokenManager = new fireauth.StsTokenManager(rpcHandler);
    stsTokenManager.setRefreshToken(obj['refreshToken']);
    stsTokenManager.setAccessToken(
        obj['accessToken'], obj['expirationTime'] || 0);
  }
  return stsTokenManager;
};


/**
 * @typedef {{
 *   accessToken: (?string),
 *   expirationTime: (number),
 *   refreshToken: (?string)
 * }}
 */
fireauth.StsTokenManager.Response;


/**
 * @typedef {{
 *   access_token: (?string|undefined),
 *   expires_in: (number|undefined),
 *   refresh_token: (?string|undefined)
 * }}
 */
fireauth.StsTokenManager.ResponseData;


/**
 * @param {?string} refreshToken The STS refresh token.
 */
fireauth.StsTokenManager.prototype.setRefreshToken = function(refreshToken) {
  this.refreshToken_ = refreshToken;
};


/**
 * @param {?string} accessToken The STS access token.
 * @param {number} expirationTime  The STS token expiration time.
 */
fireauth.StsTokenManager.prototype.setAccessToken = function(
    accessToken, expirationTime) {
  this.accessToken_ = accessToken;
  this.expirationTime_ = expirationTime;
};


/**
 * @return {?string} The refresh token.
 */
fireauth.StsTokenManager.prototype.getRefreshToken = function() {
  return this.refreshToken_;
};


/**
 * @return {number} The STS access token expiration time.
 */
fireauth.StsTokenManager.prototype.getExpirationTime = function() {
  return this.expirationTime_;
};


/**
 * The number of milliseconds before the official expiration time of a token
 * to refresh that token, to provide a buffer for RPCs to complete.
 * @const {number}
 * @private
 */
fireauth.StsTokenManager.TOKEN_REFRESH_BUFFER_ = 30 * 1000;


/**
 * @return {boolean} Whether the STS access token is expired or not.
 * @private
 */
fireauth.StsTokenManager.prototype.isExpired_ = function() {
  return goog.now() >
      this.expirationTime_ - fireauth.StsTokenManager.TOKEN_REFRESH_BUFFER_;
};


/**
 * Parses a response from the server that contains STS tokens (e.g. from
 * VerifyAssertion or VerifyPassword) and save the access token, refresh token,
 * and expiration time.
 * @param {!Object} response The backend response.
 * @return {!string} The STS access token.
 */
fireauth.StsTokenManager.prototype.parseServerResponse = function(response) {
  var idToken = response[fireauth.RpcHandler.AuthServerField.ID_TOKEN];
  var refreshToken =
      response[fireauth.RpcHandler.AuthServerField.REFRESH_TOKEN];
  var expirationTime = fireauth.StsTokenManager.calcOffsetTimestamp_(
      response[fireauth.RpcHandler.AuthServerField.EXPIRES_IN]);
  this.setAccessToken(idToken, expirationTime);
  this.setRefreshToken(refreshToken);
  return idToken;
};


/**
 * Converts STS token manager instance to server response object.
 * @return {!Object}
 */
fireauth.StsTokenManager.prototype.toServerResponse = function() {
  var stsTokenManagerResponse = {};
  stsTokenManagerResponse[fireauth.RpcHandler.AuthServerField.ID_TOKEN] =
      this.accessToken_;
  // Refresh token could be expired.
  stsTokenManagerResponse[fireauth.RpcHandler.AuthServerField.REFRESH_TOKEN] =
      this.getRefreshToken();
  stsTokenManagerResponse[fireauth.RpcHandler.AuthServerField.EXPIRES_IN] =
      (this.getExpirationTime() - goog.now()) / 1000;
  return stsTokenManagerResponse;
};


/**
 * Copies IdToken, refreshToken and expirationTime from tokenManagerToCopy.
 * @param {!fireauth.StsTokenManager} tokenManagerToCopy
 */
fireauth.StsTokenManager.prototype.copy = function(tokenManagerToCopy) {
  this.accessToken_ = tokenManagerToCopy.accessToken_;
  this.refreshToken_ = tokenManagerToCopy.refreshToken_;
  this.expirationTime_ = tokenManagerToCopy.expirationTime_;
};


/**
 * @param {number|string} offset The offset to add to the current time, in
 *     seconds.
 * @return {number} The timestamp corresponding to the current time plus offset.
 * @private
 */
fireauth.StsTokenManager.calcOffsetTimestamp_ = function(offset) {
  return goog.now() + parseInt(offset, 10) * 1000;
};


/**
 * Exchanges the current refresh token with an access and refresh token.
 * @return {!goog.Promise<?fireauth.StsTokenManager.Response>}
 * @private
 */
fireauth.StsTokenManager.prototype.exchangeRefreshToken_ = function() {
  var data = {
    'grant_type': 'refresh_token',
    'refresh_token': this.refreshToken_
  };
  return this.requestToken_(data);
};


/**
 * Sends a request to STS token endpoint for an access/refresh token.
 * @param {!Object} data The request data to send to STS token endpoint.
 * @return {!goog.Promise<?fireauth.StsTokenManager.Response>}
 * @private
 */
fireauth.StsTokenManager.prototype.requestToken_ = function(data) {
  var self = this;
  // Send RPC request to STS token endpoint.
  return this.rpcHandler_.requestStsToken(data).then(function(resp) {
    var response = /** @type {!fireauth.StsTokenManager.ResponseData} */ (resp);
    self.accessToken_ =
        response[fireauth.RpcHandler.StsServerField.ACCESS_TOKEN];
    // Update expiration time.
    self.expirationTime_ = fireauth.StsTokenManager.calcOffsetTimestamp_(
        response[fireauth.RpcHandler.StsServerField.EXPIRES_IN]);
    self.refreshToken_ =
        response[fireauth.RpcHandler.StsServerField.REFRESH_TOKEN];
    return /** @type {fireauth.StsTokenManager.Response} */ ({
      'accessToken': self.accessToken_,
      'expirationTime': self.expirationTime_,
      'refreshToken': self.refreshToken_
    });
  }).thenCatch(function(error) {
    // Refresh token expired or user deleted. In this case, reset refresh token
    // to prevent sending the request again to the STS server unless
    // the token is manually updated, perhaps via successful reauthentication.
    if (error['code'] == 'auth/user-token-expired') {
      self.refreshToken_ = null;
    }
    throw error;
  });
};


/** @return {boolean} Whether the refresh token is expired. */
fireauth.StsTokenManager.prototype.isRefreshTokenExpired = function() {
  return !!(this.accessToken_ && !this.refreshToken_);
};


/**
 * Returns an STS token. If the cached one is unexpired it is directly returned.
 * Otherwise the existing ID token or refresh token is exchanged for a new one.
 * If there is no user signed in, returns null.
 *
 * @param {boolean=} opt_forceRefresh Whether to force refresh token exchange.
 * @return {!goog.Promise<?fireauth.StsTokenManager.Response>}
 */
fireauth.StsTokenManager.prototype.getToken = function(opt_forceRefresh) {
  var self = this;
  var forceRefresh = !!opt_forceRefresh;
  // Refresh token is expired.
  if (this.isRefreshTokenExpired()) {
    return goog.Promise.reject(
        new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED));
  }
  if (!forceRefresh && this.accessToken_ && !this.isExpired_()) {
    // Cached STS access token not expired, return it.
    return /** @type {!goog.Promise} */ (goog.Promise.resolve({
      'accessToken': self.accessToken_,
      'expirationTime': self.expirationTime_,
      'refreshToken': self.refreshToken_
    }));
  } else if (this.refreshToken_) {
    // Expired but refresh token available, exchange refresh token for STS
    // token.
    return this.exchangeRefreshToken_();
  } else {
    // No token, return null token.
    return goog.Promise.resolve(
        /** @type {?fireauth.StsTokenManager.Response} */ (null));
  }
};
