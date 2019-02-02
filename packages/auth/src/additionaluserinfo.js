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
 * @fileoverview Defines all the fireauth additional user info interfaces,
 * implementations and subclasses.
 */

goog.provide('fireauth.AdditionalUserInfo');
goog.provide('fireauth.FacebookAdditionalUserInfo');
goog.provide('fireauth.FederatedAdditionalUserInfo');
goog.provide('fireauth.GenericAdditionalUserInfo');
goog.provide('fireauth.GithubAdditionalUserInfo');
goog.provide('fireauth.GoogleAdditionalUserInfo');
goog.provide('fireauth.TwitterAdditionalUserInfo');

goog.require('fireauth.IdToken');
goog.require('fireauth.idp');
goog.require('fireauth.object');
goog.require('fireauth.util');


/**
 * The interface that represents additional user info.
 * @interface
 */
fireauth.AdditionalUserInfo = function() {};


/**
 * Constructs the corresponding additional user info for the backend
 * verifyAssertion response.
 * @param {?Object|undefined} resp The backend verifyAssertion,
 *     verifyPhoneNumber or verifyPassword/setAccountInfo response.
 * @return {?fireauth.AdditionalUserInfo} The fireauth.AdditionalUserInfo
 *     instance.
 */
fireauth.AdditionalUserInfo.fromPlainObject = function(resp) {
  var factory = {};
  factory[fireauth.idp.ProviderId.FACEBOOK] =
      fireauth.FacebookAdditionalUserInfo;
  factory[fireauth.idp.ProviderId.GOOGLE] =
      fireauth.GoogleAdditionalUserInfo;
  factory[fireauth.idp.ProviderId.GITHUB] =
      fireauth.GithubAdditionalUserInfo;
  factory[fireauth.idp.ProviderId.TWITTER] =
      fireauth.TwitterAdditionalUserInfo;
  // Provider ID and UID are required.
  var providerId =
      resp &&
      resp[fireauth.AdditionalUserInfo.VerifyAssertionField.PROVIDER_ID];
  try {
    // Provider ID already present.
    if (providerId) {
      if (factory[providerId]) {
        // 1st class supported federated providers.
        return new factory[providerId](resp);
      } else {
        // Generic federated providers.
        return new fireauth.FederatedAdditionalUserInfo(
            /** @type {!Object} */ (resp));
      }
    } else if (typeof resp[fireauth.AdditionalUserInfo.VerifyAssertionField
                           .ID_TOKEN] !== 'undefined') {
      // For all other ID token responses with no providerId, get the required
      // providerId from the ID token itself.
      return new fireauth.GenericAdditionalUserInfo(
          /** @type {!Object} */ (resp));
    }
  } catch (e) {
    // Do nothing, null will be returned.
  }
  return null;
};



/**
 * verifyAssertion response additional user info fields.
 * @enum {string}
 */
fireauth.AdditionalUserInfo.VerifyAssertionField = {
  ID_TOKEN: 'idToken',
  IS_NEW_USER: 'isNewUser',
  KIND: 'kind',
  PROVIDER_ID: 'providerId',
  RAW_USER_INFO: 'rawUserInfo',
  SCREEN_NAME: 'screenName'
};


/**
 * Constructs a generic additional user info object from the backend
 * verifyPhoneNumber and verifyPassword provider response.
 * @param {!Object} info The verifyPhoneNumber/verifyPassword/setAccountInfo
 *     response data object.
 * @constructor
 * @implements {fireauth.AdditionalUserInfo}
 */
fireauth.GenericAdditionalUserInfo = function(info) {
  // Federated provider profile data.
  var providerId =
      info[fireauth.AdditionalUserInfo.VerifyAssertionField.PROVIDER_ID];
  // Try to get providerId from the ID token if available.
  if (!providerId &&
      info[fireauth.AdditionalUserInfo.VerifyAssertionField.ID_TOKEN]) {
    // verifyPassword/setAccountInfo and verifyPhoneNumber return an ID token
    // but no providerId. Get providerId from the token itself.
    // isNewUser will be returned for verifyPhoneNumber.
    var idToken = fireauth.IdToken.parse(
        info[fireauth.AdditionalUserInfo.VerifyAssertionField.ID_TOKEN]);
    if (idToken && idToken.getProviderId()) {
      providerId = idToken.getProviderId();
    }
  }
  if (!providerId) {
    // This is internal only.
    throw new Error('Invalid additional user info!');
  }
  // For custom token and anonymous token, set provider ID to null.
  if (providerId == fireauth.idp.ProviderId.ANONYMOUS ||
      providerId == fireauth.idp.ProviderId.CUSTOM) {
      providerId = null;
  }
  // Check whether user is new. Temporary Solution since backend does not return
  // isNewUser field for SignupNewUserResponse.
  var isNewUser = false;
  if (typeof info[fireauth.AdditionalUserInfo.VerifyAssertionField.IS_NEW_USER]
      !== 'undefined') {
    isNewUser =
        !!info[fireauth.AdditionalUserInfo.VerifyAssertionField.IS_NEW_USER];
  } else if (info[fireauth.AdditionalUserInfo.VerifyAssertionField.KIND]
             === 'identitytoolkit#SignupNewUserResponse') {
    //For SignupNewUserResponse, always set isNewUser to true.
    isNewUser = true;
  }
  // Set required providerId.
  fireauth.object.setReadonlyProperty(this, 'providerId', providerId);
  // Set read-only isNewUser property.
  fireauth.object.setReadonlyProperty(this, 'isNewUser', isNewUser);
};


/**
 * Constructs a federated additional user info object from the backend
 * verifyAssertion federated provider response.
 * @param {!Object} info The verifyAssertion response data object.
 * @constructor
 * @extends {fireauth.GenericAdditionalUserInfo}
 */
fireauth.FederatedAdditionalUserInfo = function(info) {
  fireauth.FederatedAdditionalUserInfo.base(this, 'constructor', info);
  // Federated provider profile data.
  // This structure will also be used for generic IdPs.
  var profile = fireauth.util.parseJSON(
      info[fireauth.AdditionalUserInfo.VerifyAssertionField.RAW_USER_INFO] ||
      '{}');
  // Set read-only profile property.
  fireauth.object.setReadonlyProperty(
      this,
      'profile',
      fireauth.object.unsafeCreateReadOnlyCopy(profile || {}));
};
goog.inherits(
    fireauth.FederatedAdditionalUserInfo, fireauth.GenericAdditionalUserInfo);


/**
 * Constructs a Facebook additional user info object from the backend
 * verifyAssertion Facebook provider response.
 * @param {!Object} info The verifyAssertion response data object.
 * @constructor
 * @extends {fireauth.FederatedAdditionalUserInfo}
 */
fireauth.FacebookAdditionalUserInfo = function(info) {
  fireauth.FacebookAdditionalUserInfo.base(this, 'constructor', info);
  // This should not happen as this object is initialized via fromPlainObject.
  if (this['providerId'] != fireauth.idp.ProviderId.FACEBOOK) {
    throw new Error('Invalid provider ID!');
  }
};
goog.inherits(
    fireauth.FacebookAdditionalUserInfo, fireauth.FederatedAdditionalUserInfo);



/**
 * Constructs a GitHub additional user info object from the backend
 * verifyAssertion GitHub provider response.
 * @param {!Object} info The verifyAssertion response data object.
 * @constructor
 * @extends {fireauth.FederatedAdditionalUserInfo}
 */
fireauth.GithubAdditionalUserInfo = function(info) {
  fireauth.GithubAdditionalUserInfo.base(this, 'constructor', info);
  // This should not happen as this object is initialized via fromPlainObject.
  if (this['providerId'] != fireauth.idp.ProviderId.GITHUB) {
    throw new Error('Invalid provider ID!');
  }
  // GitHub username.
  fireauth.object.setReadonlyProperty(
      this,
      'username',
      (this['profile'] && this['profile']['login']) || null);
};
goog.inherits(
    fireauth.GithubAdditionalUserInfo, fireauth.FederatedAdditionalUserInfo);



/**
 * Constructs a Google additional user info object from the backend
 * verifyAssertion Google provider response.
 * @param {!Object} info The verifyAssertion response data object.
 * @constructor
 * @extends {fireauth.FederatedAdditionalUserInfo}
 */
fireauth.GoogleAdditionalUserInfo = function(info) {
  fireauth.GoogleAdditionalUserInfo.base(this, 'constructor', info);
  // This should not happen as this object is initialized via fromPlainObject.
  if (this['providerId'] != fireauth.idp.ProviderId.GOOGLE) {
    throw new Error('Invalid provider ID!');
  }
};
goog.inherits(
    fireauth.GoogleAdditionalUserInfo, fireauth.FederatedAdditionalUserInfo);



/**
 * Constructs a Twitter additional user info object from the backend
 * verifyAssertion Twitter provider response.
 * @param {!Object} info The verifyAssertion response data object.
 * @constructor
 * @extends {fireauth.FederatedAdditionalUserInfo}
 */
fireauth.TwitterAdditionalUserInfo = function(info) {
  fireauth.TwitterAdditionalUserInfo.base(this, 'constructor', info);
  // This should not happen as this object is initialized via fromPlainObject.
  if (this['providerId'] != fireauth.idp.ProviderId.TWITTER) {
    throw new Error('Invalid provider ID!');
  }
  // Twitter user name.
  fireauth.object.setReadonlyProperty(
      this,
      'username',
      info[fireauth.AdditionalUserInfo.VerifyAssertionField.SCREEN_NAME] ||
      null);
};
goog.inherits(
    fireauth.TwitterAdditionalUserInfo, fireauth.FederatedAdditionalUserInfo);
