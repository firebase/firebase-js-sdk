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
 * @fileoverview Defines the OAuth helper widget state.
 */

goog.provide('fireauth.OAuthHelperState');

goog.require('fireauth.AuthEvent');


/**
 * Defines the OAuth helper widget state.
 * @param {string} apiKey The API key.
 * @param {string} appName The App name.
 * @param {!fireauth.AuthEvent.Type} type The OAuth helper mode
 * @param {?string=} opt_eventId The event identifier.
 * @param {?string=} opt_redirectUrl The optional redirect URL for redirect
 *     mode.
 * @param {?string=} opt_clientVersion The optional client version.
 * @param {?string=} opt_displayName The application display name.
 * @param {?string=} opt_apn The optional Android package name.
 * @param {?string=} opt_ibi The optional iOS bundle ID.
 * @param {?string=} opt_eid The optional Auth endpoint ID.
 * @param {?Array<string>=} opt_frameworks The optional list of framework IDs.
 * @param {?string=} opt_clientId The optional OAuth client ID.
 * @param {?string=} opt_sha1Cert The optional SHA-1 hash of Android cert.
 * @param {?string=} opt_tenantId The optional tenant ID.
 * @constructor
 */
fireauth.OAuthHelperState = function(
    apiKey, appName, type, opt_eventId, opt_redirectUrl, opt_clientVersion,
    opt_displayName, opt_apn, opt_ibi, opt_eid, opt_frameworks, opt_clientId,
    opt_sha1Cert, opt_tenantId) {
  /** @const @private {string} The API key. */
  this.apiKey_ = apiKey;
  /** @const @private {string} The App name. */
  this.appName_ = appName;
  /** @const @private {!fireauth.AuthEvent.Type} The OAuth helper mode. */
  this.type_ = type;
  /** @const @private {?string} The event identifier. */
  this.eventId_ = opt_eventId || null;
  /** @const @private {?string} The redirect URL for redirect mode. */
  this.redirectUrl_ = opt_redirectUrl || null;
  /** @const @private {?string} The client version. */
  this.clientVersion_ = opt_clientVersion || null;
  /** @const @private {?string} The application display name. */
  this.displayName_ = opt_displayName || null;
  /** @const @private {?string} The Android package name. */
  this.apn_ = opt_apn || null;
  /** @const @private {?string} The iOS bundle ID. */
  this.ibi_ = opt_ibi || null;
  /** @const @private {?string} The endpoint ID. */
  this.eid_ = opt_eid || null;
  /** @const @private {!Array<string>} The list of framework IDs. */
  this.frameworks_ = opt_frameworks || [];
  /** @const @private {?string} The OAuth client ID. */
  this.clientId_ = opt_clientId || null;
  /** @const @private {?string} The SHA-1 hash of Android cert. */
  this.sha1Cert_ = opt_sha1Cert || null;
  /** @const @private {?string} The tenant ID. */
  this.tenantId_ = opt_tenantId || null;
};


/** @return {?string} The OAuth client ID. */
fireauth.OAuthHelperState.prototype.getClientId = function() {
  return this.clientId_;
};


/** @return {?string} The SHA-1 hash of the Android cert. */
fireauth.OAuthHelperState.prototype.getSha1Cert = function() {
  return this.sha1Cert_;
};


/** @return {!fireauth.AuthEvent.Type} The type of Auth event. */
fireauth.OAuthHelperState.prototype.getType = function() {
  return this.type_;
};


/** @return {?string} The Auth event identifier. */
fireauth.OAuthHelperState.prototype.getEventId = function() {
  return this.eventId_;
};


/** @return {string} The API key. */
fireauth.OAuthHelperState.prototype.getApiKey = function() {
  return this.apiKey_;
};


/** @return {string} The App name. */
fireauth.OAuthHelperState.prototype.getAppName = function() {
  return this.appName_;
};


/** @return {?string} The redirect URL. */
fireauth.OAuthHelperState.prototype.getRedirectUrl = function() {
  return this.redirectUrl_;
};


/** @return {?string} The client version. */
fireauth.OAuthHelperState.prototype.getClientVersion = function() {
  return this.clientVersion_;
};


/** @return {?string} The application display name if available. */
fireauth.OAuthHelperState.prototype.getDisplayName = function() {
  return this.displayName_;
};


/** @return {?string} The Android package name. */
fireauth.OAuthHelperState.prototype.getApn = function() {
  return this.apn_;
};


/** @return {?string} The iOS bundle ID. */
fireauth.OAuthHelperState.prototype.getIbi = function() {
  return this.ibi_;
};


/** @return {?string} The Auth endpoint ID. */
fireauth.OAuthHelperState.prototype.getEndpointId = function() {
  return this.eid_;
};


/** @return {?string} The tenant ID. */
fireauth.OAuthHelperState.prototype.getTenantId = function() {
  return this.tenantId_;
};


/** @return {!Array<string>} The list of framework IDs. */
fireauth.OAuthHelperState.prototype.getFrameworks = function() {
  return this.frameworks_;
};


/** @return {!Object} The plain object representation of OAuth helper state. */
fireauth.OAuthHelperState.prototype.toPlainObject = function() {
  return {
    'apiKey': this.apiKey_,
    'appName': this.appName_,
    'type': this.type_,
    'eventId': this.eventId_,
    'redirectUrl': this.redirectUrl_,
    'clientVersion': this.clientVersion_,
    'displayName': this.displayName_,
    'apn': this.apn_,
    'ibi': this.ibi_,
    'eid': this.eid_,
    'fw': this.frameworks_,
    'clientId': this.clientId_,
    'sha1Cert': this.sha1Cert_,
    'tenantId': this.tenantId_
  };
};


/**
 * @param {?Object} rawResponse The plain object representation of OAuth helper
 *     state.
 * @return {?fireauth.OAuthHelperState} The OAuth helper state representation of
 *     plain object.
 */
fireauth.OAuthHelperState.fromPlainObject = function(rawResponse) {
  var response = rawResponse || {};
  if (response['type'] && response['apiKey']) {
    return new fireauth.OAuthHelperState(
        response['apiKey'],
        response['appName'] || '',
        response['type'],
        response['eventId'],
        response['redirectUrl'],
        response['clientVersion'],
        response['displayName'],
        response['apn'],
        response['ibi'],
        response['eid'],
        response['fw'],
        response['clientId'],
        response['sha1Cert'],
        response['tenantId']);
  }
  return null;
};
