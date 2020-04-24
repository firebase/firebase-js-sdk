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
 * @fileoverview Defines the IdP provider IDs and related settings.
 */

goog.provide('fireauth.idp');
goog.provide('fireauth.idp.IdpSettings');
goog.provide('fireauth.idp.ProviderId');
goog.provide('fireauth.idp.Settings');
goog.provide('fireauth.idp.SignInMethod');

goog.require('fireauth.constants');


/**
 * Enums for supported provider IDs. These provider IDs correspond to the
 * sign_in_provider in the Firebase ID token and do not correspond to the
 * supported client exposed firebase.auth.AuthProviders.
 * @enum {string}
 */
fireauth.idp.ProviderId = {
  ANONYMOUS: 'anonymous',
  CUSTOM: 'custom',
  FACEBOOK: 'facebook.com',
  FIREBASE: 'firebase',
  GITHUB: 'github.com',
  GOOGLE: 'google.com',
  PASSWORD: 'password',
  PHONE: 'phone',
  TWITTER: 'twitter.com'
};


/**
 * Enums for supported sign in methods.
 * @enum {string}
 */
fireauth.idp.SignInMethod = {
  EMAIL_LINK: 'emailLink',
  EMAIL_PASSWORD: 'password',
  FACEBOOK: 'facebook.com',
  GITHUB: 'github.com',
  GOOGLE: 'google.com',
  PHONE: 'phone',
  TWITTER: 'twitter.com'
};


/**
 * The settings of an identity provider. The fields are:
 * <ul>
 * <li>languageParam: defines the custom OAuth language parameter.
 * <li>popupWidth: defines the popup recommended width.
 * <li>popupHeight: defines the popup recommended height.
 * <li>providerId: defines the provider ID.
 * <li>reservedOAuthParameters: defines the list of reserved OAuth parameters.
 * </ul>
 * @typedef {{
 *   languageParam: (?string|undefined),
 *   popupWidth: (?number|undefined),
 *   popupHeight: (?number|undefined),
 *   providerId: !fireauth.idp.ProviderId,
 *   reservedOAuthParameters: !Array<string>
 * }}
 */
fireauth.idp.IdpSettings;


/**
 * The list of reserved OAuth 1.0 parameters.
 * @const {!Array<string>}
 */
fireauth.idp.RESERVED_OAUTH1_PARAMS =
    ['oauth_consumer_key', 'oauth_nonce', 'oauth_signature',
     'oauth_signature_method', 'oauth_timestamp', 'oauth_token',
     'oauth_version'];


/**
 * The list of reserved OAuth 2.0 parameters.
 * @const {!Array<string>}
 */
fireauth.idp.RESERVED_OAUTH2_PARAMS =
    ['client_id', 'response_type', 'scope', 'redirect_uri', 'state'];


/**
 * The recommendations for the different IdP display settings.
 * @enum {!fireauth.idp.IdpSettings}
 */
fireauth.idp.Settings = {
  FACEBOOK: {
    languageParam: 'locale',
    popupWidth: 700,
    popupHeight: 600,
    providerId: fireauth.idp.ProviderId.FACEBOOK,
    reservedOAuthParameters: fireauth.idp.RESERVED_OAUTH2_PARAMS,
  },
  GITHUB: {
    languageParam: null,
    popupWidth: 500,
    popupHeight: 750,
    providerId: fireauth.idp.ProviderId.GITHUB,
    reservedOAuthParameters: fireauth.idp.RESERVED_OAUTH2_PARAMS,
  },
  GOOGLE: {
    languageParam: 'hl',
    popupWidth: 515,
    popupHeight: 680,
    providerId: fireauth.idp.ProviderId.GOOGLE,
    reservedOAuthParameters: fireauth.idp.RESERVED_OAUTH2_PARAMS,
  },
  TWITTER: {
    languageParam: 'lang',
    popupWidth: 485,
    popupHeight: 705,
    providerId: fireauth.idp.ProviderId.TWITTER,
    reservedOAuthParameters: fireauth.idp.RESERVED_OAUTH1_PARAMS,
  },
  APPLE: {
    languageParam: 'locale',
    popupWidth: 640,
    popupHeight: 600,
    providerId: 'apple.com',
    reservedOAuthParameters: [],
  },
};


/**
 * @param {!fireauth.idp.ProviderId} providerId The requested provider ID.
 * @return {?fireauth.idp.Settings} The settings for the requested provider ID.
 */
fireauth.idp.getIdpSettings = function(providerId) {
  for (var key in fireauth.idp.Settings) {
    if (fireauth.idp.Settings[key].providerId == providerId) {
      return fireauth.idp.Settings[key];
    }
  }
  return null;
};


/**
 * @param {!fireauth.idp.ProviderId} providerId The requested provider ID.
 * @return {!Array<string>} The list of reserved OAuth parameters.
 */
fireauth.idp.getReservedOAuthParams = function(providerId) {
  var settings = fireauth.idp.getIdpSettings(providerId);
  return (settings && settings.reservedOAuthParameters) || [];
};


/**
 * @param {?string|undefined} identifier The provider identifier.
 * @return {boolean} Whether the identifier provided is a SAML provider ID.
 */
fireauth.idp.isSaml = function(identifier) {
   return typeof identifier === 'string' &&
     identifier.indexOf(fireauth.constants.SAML_PREFIX) == 0;
};
