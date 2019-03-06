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
 * @fileoverview Utility functions to handle Firebase Auth ID tokens.
 */

goog.provide('fireauth.IdToken');

goog.require('goog.crypt.base64');


/**
 * Parses the token string into a {@code Token} object.
 * @param {!fireauth.IdToken.JsonToken} token The parsed JSON token.
 * @constructor
 */
fireauth.IdToken = function(token) {
  /** @private {string} The issuer of the token. */
  this.iss_ = token['iss'];
  /** @private {string} The audience of the token. */
  this.aud_ = token['aud'];
  /** @private {number} The expire time in seconds of the token. */
  this.exp_ = token['exp'];
  /** @private {string} The local user ID of the token. */
  this.localId_ = token['sub'];
  var now = goog.now() / 1000;
  /** @private {number} The issue time in seconds of the token. */
  this.iat_ = token['iat'] || (now > this.exp_ ? this.exp_ : now);
  /** @private {?string} The email address of the token. */
  this.email_ = token['email'] || null;
  /** @private {boolean} Whether the user is verified. */
  this.verified_ = !!token['verified'];
  /** @private {?string} The provider ID of the token. */
  this.providerId_ = token['provider_id'] ||
      (token['firebase'] && token['firebase']['sign_in_provider']) ||
      null;
  /** @private {boolean} Whether the user is anonymous. */
  this.anonymous_ = !!token['is_anonymous'] || this.providerId_ == 'anonymous';
  /** @private {?string} The federated ID of the token. */
  this.federatedId_ = token['federated_id'] || null;
  /** @private {?string} The display name of the token. */
  this.displayName_ = token['display_name'] || null;
  /** @private {?string} The photo URL of the token. */
  this.photoURL_ = token['photo_url'] || null;
  /**
   * @private {?string} The phone number of the user identified by the token.
   */
  this.phoneNumber_ = token['phone_number'] || null;
};


/**
 * @typedef {{
 *   identities: (?Object|undefined),
 *   sign_in_provider: (?string|undefined)
 * }}
 */
fireauth.IdToken.Firebase;


/**
 * @typedef {{
 *   iss: string,
 *   aud: string,
 *   exp: number,
 *   sub: string,
 *   iat: (?number|undefined),
 *   email: (?string|undefined),
 *   verified: (?boolean|undefined),
 *   provider_id: (?string|undefined),
 *   is_anonymous: (?boolean|undefined),
 *   federated_id: (?string|undefined),
 *   display_name: (?string|undefined),
 *   photo_url: (?string|undefined),
 *   phone_number: (?string|undefined),
 *   firebase: (?fireauth.IdToken.Firebase|undefined)
 * }}
 */
fireauth.IdToken.JsonToken;


/** @return {?string} The email address of the account. */
fireauth.IdToken.prototype.getEmail = function() {
  return this.email_;
};


/** @return {number} The expire time in seconds. */
fireauth.IdToken.prototype.getExp = function() {
  return this.exp_;
};


/** @return {?string} The ID of the identity provider. */
fireauth.IdToken.prototype.getProviderId = function() {
  return this.providerId_;
};


/** @return {?string} The display name of the account. */
fireauth.IdToken.prototype.getDisplayName = function() {
  return this.displayName_;
};


/** @return {?string} The photo URL of the account. */
fireauth.IdToken.prototype.getPhotoUrl = function() {
  return this.photoURL_;
};


/** @return {string} The user ID of the account. */
fireauth.IdToken.prototype.getLocalId = function() {
  return this.localId_;
};


/** @return {?string} The federated ID of the account. */
fireauth.IdToken.prototype.getFederatedId = function() {
  return this.federatedId_;
};


/** @return {boolean} Whether the user is anonymous. */
fireauth.IdToken.prototype.isAnonymous = function() {
  return this.anonymous_;
};


/** @return {boolean} Whether the user email is verified. */
fireauth.IdToken.prototype.isVerified = function() {
  return this.verified_;
};


/** @return {boolean} Whether token is expired. */
fireauth.IdToken.prototype.isExpired = function() {
  var now = Math.floor(goog.now() / 1000);
  // It is expired if token expiration time is less than current time.
  return this.getExp() <= now;
};


/** @return {string} The issuer of the token. */
fireauth.IdToken.prototype.getIssuer = function() {
  return this.iss_;
};


/** @return {?string} The phone number of the account. */
fireauth.IdToken.prototype.getPhoneNumber = function() {
  return this.phoneNumber_;
};


/**
 * Parses the JWT token and extracts the information part without verifying the
 * token signature.
 * @param {string} tokenString The JWT token.
 * @return {?fireauth.IdToken} The decoded token.
 */
fireauth.IdToken.parse = function(tokenString) {
  var token = fireauth.IdToken.parseIdTokenClaims(tokenString);
  if (token && token['sub'] && token['iss'] && token['aud'] && token['exp']) {
    return new fireauth.IdToken(
        /** @type {!fireauth.IdToken.JsonToken} */ (token));
  }
  return null;
};

/**
 * Converts the information part of JWT token to plain object format.
 * @param {?string} tokenString The JWT token.
 * @return {?Object}
 */
fireauth.IdToken.parseIdTokenClaims = function(tokenString) {
  if (!tokenString) {
    return null;
  }
  // Token format is <algorithm>.<info>.<sig>
  var fields = tokenString.split('.');
  if (fields.length != 3) {
    return null;
  }
  var jsonInfo = fields[1];
  // Google base64 library does not handle padding.
  var padLen = (4 - jsonInfo.length % 4) % 4;
  for (var i = 0; i < padLen; i++) {
    jsonInfo += '.';
  }
  try {
    var token = JSON.parse(goog.crypt.base64.decodeString(jsonInfo, true));
    return /** @type {?Object} */ (token);
  } catch (e) {}
  return null;
};
