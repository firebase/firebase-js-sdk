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
 * @fileoverview Defines the multi-factor enrollment information.
 */

goog.provide('fireauth.MultiFactorInfo');
goog.provide('fireauth.PhoneMultiFactorInfo');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.constants');
goog.require('fireauth.object');


/**
 * Abstract class representing a `firebase.auth.MultiFactorInfo` interface.
 * This is typically parsed from a server response.
 * @param {?Object} resp The server response.
 * @abstract
 * @constructor
 */
fireauth.MultiFactorInfo = function(resp) {
  var factorId = resp && this.getFactorId(resp);
  if (factorId && resp &&
      resp[fireauth.MultiFactorInfo.MfaEnrollmentField.MFA_ENROLLMENT_ID]) {
    fireauth.object.setReadonlyProperty(
        this,
        'uid',
        resp[fireauth.MultiFactorInfo.MfaEnrollmentField.MFA_ENROLLMENT_ID]);
    fireauth.object.setReadonlyProperty(
        this,
        'displayName',
        resp[fireauth.MultiFactorInfo.MfaEnrollmentField.DISPLAY_NAME] || null);
    var enrollmentTime = null;
    // Encoded using [RFC 3339](https://www.ietf.org/rfc/rfc3339.txt) format.
    // For example, "2017-01-15T01:30:15.01Z".
    // This can be parsed directly in modern browsers via Date constructor.
    // This can be computed using Data.prototype.toISOString.
    if (resp[fireauth.MultiFactorInfo.MfaEnrollmentField.ENROLLED_AT]) {
      enrollmentTime = new Date(
            resp[fireauth.MultiFactorInfo.MfaEnrollmentField.ENROLLED_AT])
                .toUTCString();
    }
    fireauth.object.setReadonlyProperty(
        this,
        'enrollmentTime',
        enrollmentTime);
    fireauth.object.setReadonlyProperty(
        this,
        'factorId',
        factorId);
  } else {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.INTERNAL_ERROR,
        'Internal assert: invalid MultiFactorInfo object');
  }
};


/** @return {!Object} The plain object representation. */
fireauth.MultiFactorInfo.prototype.toPlainObject = function() {
  return {
    'uid': this['uid'],
    'displayName': this['displayName'],
    'factorId': this['factorId'],
    'enrollmentTime': this['enrollmentTime']
  };
};


/**
 * Returns the factor ID based on the server response. This function needs to be
 * implemented by the subclass.
 * @param {!Object} resp The server response.
 * @return {?fireauth.constants.SecondFactorType} The factor ID based on the
 *     response type.
 * @protected
 */
fireauth.MultiFactorInfo.prototype.getFactorId = goog.abstractMethod;


/**
 * Returns the corresponding `firebase.auth.MultiFactor` instance if the
 * server response maps to one. Otherwise, null is returned.
 * @param {?Object} resp The server response.
 * @return {?fireauth.MultiFactorInfo} The corresponding
 *     `firebase.auth.MultiFactorInfo` instance, null otherwise.
 */
fireauth.MultiFactorInfo.fromServerResponse = function(resp) {
  var multiFactorInfo;
  // Only PhoneMultiFactorInfo currently available.
  try {
    multiFactorInfo = new fireauth.PhoneMultiFactorInfo(resp);
  } catch (e) {
    multiFactorInfo = null;
  }
  return multiFactorInfo;
};


/**
 * Returns the corresponding `firebase.auth.MultiFactor` instance if the
 * plain object maps to one. Otherwise, null is returned.
 * @param {?Object} obj The plain object representation.
 * @return {?fireauth.MultiFactorInfo} The corresponding
 *     `firebase.auth.MultiFactorInfo` instance, null otherwise.
 */
fireauth.MultiFactorInfo.fromPlainObject = function(obj) {
  var multiFactorInfo = null;
  var resp = {};
  if (!obj) {
    return null;
  }
  if (obj['uid']) {
    resp[fireauth.MultiFactorInfo.MfaEnrollmentField.MFA_ENROLLMENT_ID] =
        obj['uid'];
  }
  if (obj['displayName']) {
    resp[fireauth.MultiFactorInfo.MfaEnrollmentField.DISPLAY_NAME] =
        obj['displayName'];
  }
  if (obj['enrollmentTime']) {
    resp[fireauth.MultiFactorInfo.MfaEnrollmentField.ENROLLED_AT] =
        new Date(obj['enrollmentTime']).toISOString();
  }
  if (obj['phoneNumber']) {
    resp[fireauth.MultiFactorInfo.MfaEnrollmentField.PHONE_INFO] =
        obj['phoneNumber'];
  }

  // Only PhoneMultiFactorInfo currently available.
  try {
    multiFactorInfo = new fireauth.PhoneMultiFactorInfo(resp);
  } catch (e) {
    // Ignore error.
  }
  return multiFactorInfo;
};


/**
 * MfaEnrollment server side response fields.
 * @enum {string}
 */
fireauth.MultiFactorInfo.MfaEnrollmentField = {
  DISPLAY_NAME: 'displayName',
  ENROLLED_AT: 'enrolledAt',
  MFA_ENROLLMENT_ID: 'mfaEnrollmentId',
  PHONE_INFO: 'phoneInfo'
};


/**
 * Initializes a `firebase.auth.PhoneMultiFactorInfo` instance from the provided
 * server response.
 * @param {?Object} resp The server response.
 * @constructor
 * @extends {fireauth.MultiFactorInfo}
 */
fireauth.PhoneMultiFactorInfo = function(resp) {
  fireauth.PhoneMultiFactorInfo.base(this, 'constructor', resp);
  fireauth.object.setReadonlyProperty(
      this,
      'phoneNumber',
      // PhoneInfo may be masked for security reasons for sign-in flows after
      // the user signs in with the first factor but hasn't yet proven ownership
      // of the second factor yet.
      // For enrollment flows or for a user already signed in with a second
      // factor, this field should not be masked.
      resp[fireauth.MultiFactorInfo.MfaEnrollmentField.PHONE_INFO]);
};
goog.inherits(
    fireauth.PhoneMultiFactorInfo, fireauth.MultiFactorInfo);


/**
 * Implements the factor ID getter based on the response. If the response is an
 * invalid PhoneMultiFactorInfo, null is returned.
 * @param {!Object} resp The server response.
 * @return {?fireauth.constants.SecondFactorType} The phone factor ID.
 * @protected
 * @override
 */
fireauth.PhoneMultiFactorInfo.prototype.getFactorId = function(resp) {
  return !!resp[fireauth.MultiFactorInfo.MfaEnrollmentField.PHONE_INFO] ?
      fireauth.constants.SecondFactorType.PHONE : null;
};


/**
 * @return {!Object} The plain object representation.
 * @override
 */
fireauth.PhoneMultiFactorInfo.prototype.toPlainObject = function() {
  var obj = fireauth.PhoneMultiFactorInfo.base(this, 'toPlainObject');
  obj['phoneNumber'] = this['phoneNumber'];
  return obj;
};
