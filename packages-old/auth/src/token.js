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
 * @fileoverview Utility class to retrieve and cache STS token.
 */
goog.provide('fireauth.StsTokenManager');
goog.provide('fireauth.StsTokenManager.Response');
goog.provide('fireauth.StsTokenManager.ResponseData');

goog.require('fireauth.AuthError');
goog.require('fireauth.IdToken');
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
  /** @private {?fireauth.IdToken} The STS ID token. */
  this.accessToken_ = null;
  /** @private {number} The expiration time of the token in epoch millis. */
  this.expiresAt_ = Date.now();
};


/**
 * @return {!Object} The plain object representation of the STS token manager.
 */
fireauth.StsTokenManager.prototype.toPlainObject = function() {
  return {
    'apiKey': this.rpcHandler_.getApiKey(),
    'refreshToken': this.refreshToken_,
    'accessToken': this.accessToken_ && this.accessToken_.toString(),
    // To support downgrade flows, return expiration time.
    'expirationTime': this.getExpirationTime()
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
  let stsTokenManager = null;
  if (obj && obj['apiKey']) {
    // These should be always equals and must be enforced in internal use.
    goog.asserts.assert(obj['apiKey'] == rpcHandler.getApiKey());
    stsTokenManager = new fireauth.StsTokenManager(rpcHandler);
    stsTokenManager.setRefreshToken(obj['refreshToken']);
    stsTokenManager.setAccessToken(obj['accessToken']);
    stsTokenManager.setExpiresAt(obj['expirationTime']);
  }
  return stsTokenManager;
};


/**
 * @typedef {{
 *   accessToken: (?string),
 *   refreshToken: (?string)
 * }}
 */
fireauth.StsTokenManager.Response;


/**
 * @typedef {{
 *   access_token: (?string|undefined),
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
 */
fireauth.StsTokenManager.prototype.setAccessToken = function(accessToken) {
  this.accessToken_ = fireauth.IdToken.parse(accessToken || '');
};

/**
 * To account for client side clock skew, we try to set the expiration time
 * using the local clock by adding the server TTL. If not provided, expiresAt
 * will be set from the accessToken by taking the difference between the exp
 * and iat fields.
 *
 * @param {number=} expiresIn The expiration TTL in seconds.
 */
fireauth.StsTokenManager.prototype.setExpiresIn = function(expiresIn) {
  expiresIn = typeof expiresIn !== 'undefined' ? expiresIn :
      this.accessToken_ ? this.accessToken_.getExpiresIn() :
                          0;
  this.expiresAt_ = Date.now() + expiresIn * 1000;
}

/**
 * Allow setting expiresAt directly when we know the time is already in the
 * local clock.
 *
 * @param {number} expiresAt The expiration time in epoch millis.
 */
fireauth.StsTokenManager.prototype.setExpiresAt = function(expiresAt) {
  this.expiresAt_ = expiresAt;
}

/**
 * @return {?string} The refresh token.
 */
fireauth.StsTokenManager.prototype.getRefreshToken = function() {
  return this.refreshToken_;
};


/**
 * @return {number} The STS access token expiration time in milliseconds.
 */
fireauth.StsTokenManager.prototype.getExpirationTime = function() {
  return this.expiresAt_;
};


/**
 * The number of milliseconds before the official expiration time of a token
 * to refresh that token, to provide a buffer for RPCs to complete.
 * @const {number}
 */
fireauth.StsTokenManager.TOKEN_REFRESH_BUFFER = 30 * 1000;


/**
 * @return {boolean} Whether the STS access token is expired or not.
 * @private
 */
fireauth.StsTokenManager.prototype.isExpired_ = function() {
  return Date.now() >
      this.getExpirationTime() - fireauth.StsTokenManager.TOKEN_REFRESH_BUFFER;
};


/**
 * Parses a response from the server that contains STS tokens (e.g. from
 * VerifyAssertion or VerifyPassword) and save the access token, refresh token,
 * and expiration time.
 * @param {!Object} response The backend response.
 * @return {string} The STS access token.
 */
fireauth.StsTokenManager.prototype.parseServerResponse = function(response) {
  const idToken = response[fireauth.RpcHandler.AuthServerField.ID_TOKEN];
  this.setAccessToken(idToken);
  this.setRefreshToken(
      response[fireauth.RpcHandler.AuthServerField.REFRESH_TOKEN]);
  // Not all IDP server responses come with expiresIn, some like MFA omit it.
  const expiresIn = response[fireauth.RpcHandler.AuthServerField.EXPIRES_IN];
  this.setExpiresIn(
      typeof expiresIn !== 'undefined' ? Number(expiresIn) : undefined);
  return idToken;
};


/**
 * Converts STS token manager instance to server response object.
 * @return {!Object}
 */
fireauth.StsTokenManager.prototype.toServerResponse = function() {
  const stsTokenManagerResponse = {};
  stsTokenManagerResponse[fireauth.RpcHandler.AuthServerField.ID_TOKEN] =
      this.accessToken_ && this.accessToken_.toString();
  // Refresh token could be expired.
  stsTokenManagerResponse[fireauth.RpcHandler.AuthServerField.REFRESH_TOKEN] =
      this.getRefreshToken();
  return stsTokenManagerResponse;
};


/**
 * Copies IdToken, refreshToken and expirationTime from tokenManagerToCopy.
 * @param {!fireauth.StsTokenManager} tokenManagerToCopy
 */
fireauth.StsTokenManager.prototype.copy = function(tokenManagerToCopy) {
  this.accessToken_ = tokenManagerToCopy.accessToken_;
  this.refreshToken_ = tokenManagerToCopy.refreshToken_;
  this.expiresAt_ = tokenManagerToCopy.expiresAt_;
};


/**
 * Exchanges the current refresh token with an access and refresh token.
 * @return {!goog.Promise<?fireauth.StsTokenManager.Response>}
 * @private
 */
fireauth.StsTokenManager.prototype.exchangeRefreshToken_ = function() {
  const data = {
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
  // Send RPC request to STS token endpoint.
  return this.rpcHandler_.requestStsToken(data)
      .then((resp) => {
        const response =
            /** @type {!fireauth.StsTokenManager.ResponseData} */ (resp);
        this.accessToken_ = fireauth.IdToken.parse(
            response[fireauth.RpcHandler.StsServerField.ACCESS_TOKEN]);
        this.refreshToken_ =
            response[fireauth.RpcHandler.StsServerField.REFRESH_TOKEN];
        this.setExpiresIn(
            response[fireauth.RpcHandler.StsServerField.EXPIRES_IN]);
        return /** @type {!fireauth.StsTokenManager.Response} */ ({
          'accessToken': this.accessToken_.toString(),
          'refreshToken': this.refreshToken_
        });
      })
      .thenCatch((error) => {
        // Refresh token expired or user deleted. In this case, reset refresh
        // token to prevent sending the request again to the STS server unless
        // the token is manually updated, perhaps via successful
        // reauthentication.
        if (error['code'] == 'auth/user-token-expired') {
          this.refreshToken_ = null;
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
 * @param {boolean=} forceRefresh Whether to force refresh token exchange.
 * @return {!goog.Promise<?fireauth.StsTokenManager.Response>}
 */
fireauth.StsTokenManager.prototype.getToken = function(forceRefresh) {
  forceRefresh = !!forceRefresh;
  // Refresh token is expired.
  if (this.isRefreshTokenExpired()) {
    return goog.Promise.reject(
        new fireauth.AuthError(fireauth.authenum.Error.TOKEN_EXPIRED));
  }
  if (!forceRefresh && this.accessToken_ && !this.isExpired_()) {
    // Cached STS access token not expired, return it.
    return /** @type {!goog.Promise} */ (goog.Promise.resolve({
      'accessToken': this.accessToken_.toString(),
      'refreshToken': this.refreshToken_
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
