/**
 * @license
 * Copyright 2019 Google Inc.
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
 * @fileoverview Defines the `MultiFactorUser` class used to retrieve the
 * enrolled second factors on a user and to facilitate enrollment and
 * unenrollment of second factors.
 */

goog.provide('fireauth.MultiFactorUser');

goog.require('fireauth.MultiFactorInfo');
goog.require('fireauth.MultiFactorSession');
goog.require('fireauth.UserEventType');
goog.require('fireauth.object');
goog.require('goog.array');
goog.require('goog.events');


/**
 * Initializes the multi-factor instance corresponding to a signed in user.
 * This provides the ability to retrieve the enrolled second factors for that
 * user, as well as the ability to enroll new second factors or unenroll
 * existing ones.
 * @param {!fireauth.AuthUser} user The user the multi-factor instance
 *     represents.
 * @param {?fireauth.AuthUser.AccountInfo=} accountInfo The optional user
 *     account info.
 * @constructor
 */
fireauth.MultiFactorUser = function(user, accountInfo) {
  /**
   * @private {!fireauth.AuthUser} The user this multi-factor instance
   *     represents.
   */
  this.user_ = user;
  /** @private {!Array<!fireauth.MultiFactorInfo>} The enrolled factors. */
  this.enrolledFactors_ = [];
  /**
   * @const @private {function({userServerResponse: !Object})} The handler for
   *     user reload events.
   */
  this.userReloadedListener_ = goog.bind(this.handleUserReload_, this);
  goog.events.listen(
      this.user_,
      fireauth.UserEventType.USER_RELOADED,
      this.userReloadedListener_);
  var enrolledFactors = [];
  // AccountInfo is typically loaded from storage where it is stored in plain
  // object format. Otherwise, the enrolled factors will be loaded from
  // getAccountInfo response triggered by user reload event.
  if (accountInfo &&
      accountInfo['multiFactor'] &&
      accountInfo['multiFactor']['enrolledFactors']) {
    var enrolledFactorsPlainObject =
        accountInfo['multiFactor']['enrolledFactors'];
    goog.array.forEach(enrolledFactorsPlainObject, function(mfaEnrollment) {
      var info = fireauth.MultiFactorInfo.fromPlainObject(mfaEnrollment);
      if (info) {
        enrolledFactors.push(info);
      }
    });
  }
  this.updateEnrolledFactors_(enrolledFactors);
};


/**
 * @const @private {string} The key for the list of second factor enrollments in
 *     the GetAccountInfo server response.
 */
fireauth.MultiFactorUser.GET_ACCOUNT_INFO_MFA_INFO_ = 'mfaInfo';


/**
 * Extracts the enrolled factors from getAccountInfo response and returns an
 * array of corresponding multi-factor info data.
 * @param {!Object} resp The GetAccountInfo response object.
 * @return {!Array<!fireauth.MultiFactorInfo>} The enrolled factors.
 * @private
 */
fireauth.MultiFactorUser.extractEnrolledFactors_ = function(resp) {
  // Parse MFA enrollments.
  var mfaInfo = resp[fireauth.MultiFactorUser.GET_ACCOUNT_INFO_MFA_INFO_] || [];
  var enrolledFactors = [];
  goog.array.forEach(mfaInfo, function(mfaEnrollment) {
    var info = fireauth.MultiFactorInfo.fromServerResponse(mfaEnrollment);
    if (info) {
      enrolledFactors.push(info);
    }
  });
  return enrolledFactors;
};


/**
 * Handles user reload event. This will parse the enrollments from the
 * response and update them on the current multi-factor instance.
 * @param {{userServerResponse: !Object}} event The user reload event.
 * @private
 */
fireauth.MultiFactorUser.prototype.handleUserReload_ = function(event) {
  this.updateEnrolledFactors_(fireauth.MultiFactorUser.extractEnrolledFactors_(
      event.userServerResponse));
};


/**
 * Updates the enrolledFactors property.
 * @param {!Array<!fireauth.MultiFactorInfo>} enrolledFactors The new list of
 *     `MultiFactorInfo` objects on the user.
 * @private
 */
fireauth.MultiFactorUser.prototype.updateEnrolledFactors_ =
    function(enrolledFactors) {
  this.enrolledFactors_ = enrolledFactors;
  fireauth.object.setReadonlyProperty(
      this, 'enrolledFactors', enrolledFactors);
};


/**
 * Copies the list of enrolled factors on the user. This facilitates copying a
 * user to another user.
 * @param {!fireauth.MultiFactorUser} multiFactorUser The instance to copy.
 */
fireauth.MultiFactorUser.prototype.copy = function(multiFactorUser) {
  if (this.user_ != multiFactorUser.user_) {
    // Remove listener on old user.
    goog.events.unlisten(
        this.user_,
        fireauth.UserEventType.USER_RELOADED,
        this.userReloadedListener_);
    this.user_ = multiFactorUser.user_;
    // Add listener on new user.
    goog.events.listen(
        this.user_,
        fireauth.UserEventType.USER_RELOADED,
        this.userReloadedListener_);
  }
  this.updateEnrolledFactors_(multiFactorUser.enrolledFactors_);
};


/**
 * Provides a multi-factor session used to start a multi-factor enrollment flow.
 * @return {!goog.Promise<!fireauth.MultiFactorSession>} A promise that resolves
 *     with a multi-factor session.
 */
fireauth.MultiFactorUser.prototype.getSession = function() {
  return this.user_.getIdToken()
      .then(function(idToken) {
        return new fireauth.MultiFactorSession(idToken, null);
      });
};


/**
 * @return {!Object} The plain object representation of the `MultiFactorUser`.
 */
fireauth.MultiFactorUser.prototype.toPlainObject = function() {
  return {
    'multiFactor': goog.array.map(this.enrolledFactors_, function(info) {
      return info.toPlainObject();
    })
  };
};
