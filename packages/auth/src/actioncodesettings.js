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
 * @fileoverview Utility for firebase.auth.ActionCodeSettings and its helper
 * functions.
 */

goog.provide('fireauth.ActionCodeSettings');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');


/**
 * Defines the action code settings structure used to specify how email action
 * links are handled.
 * @param {!Object} settingsObj The action code settings object used to
 *     construct the action code link.
 * @constructor @struct @final
 */
fireauth.ActionCodeSettings = function(settingsObj) {
  // Validate the settings object passed.
  this.initialize_(settingsObj);
};


/**
 * Validate the action code settings object.
 * @param {!Object} settingsObj The action code settings object to validate.
 * @private
 */
fireauth.ActionCodeSettings.prototype.initialize_ = function(settingsObj) {
  // URL should be required.
  var continueUrl = settingsObj[fireauth.ActionCodeSettings.RawField.URL];
  if (typeof continueUrl === 'undefined') {
    throw new fireauth.AuthError(fireauth.authenum.Error.MISSING_CONTINUE_URI);
  } else if (typeof continueUrl !== 'string' ||
             (typeof continueUrl === 'string' && !continueUrl.length)) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INVALID_CONTINUE_URI);
  }
  /** @const @private {string} The continue URL. */
  this.continueUrl_ = /** @type {string} */ (continueUrl);

  // Validate Android parameters.
  /** @private {?string} The Android package name. */
  this.apn_ = null;
  /** @private {?string} The Android minimum version. */
  this.amv_ = null;
  /** @private {boolean} Whether to install the Android app. */
  this.installApp_ = false;
  var androidSettings =
      settingsObj[fireauth.ActionCodeSettings.RawField.ANDROID];
  if (androidSettings && typeof androidSettings === 'object') {
    var apn = androidSettings[
      fireauth.ActionCodeSettings.AndroidRawField.PACKAGE_NAME];
    var installApp = androidSettings[
      fireauth.ActionCodeSettings.AndroidRawField.INSTALL_APP];
    var amv = androidSettings[
      fireauth.ActionCodeSettings.AndroidRawField.MINIMUM_VERSION];
    if (typeof apn === 'string' && apn.length) {
      this.apn_ = /** @type {string} */ (apn);
      if (typeof installApp !== 'undefined' &&
          typeof installApp !== 'boolean') {
        throw new fireauth.AuthError(
            fireauth.authenum.Error.ARGUMENT_ERROR,
            fireauth.ActionCodeSettings.AndroidRawField.INSTALL_APP +
            ' property must be a boolean when specified.');
      }
      this.installApp_ = !!installApp;
      if (typeof amv !== 'undefined' &&
          (typeof amv !== 'string' ||
           (typeof amv === 'string' && !amv.length))) {
        throw new fireauth.AuthError(
            fireauth.authenum.Error.ARGUMENT_ERROR,
            fireauth.ActionCodeSettings.AndroidRawField.MINIMUM_VERSION +
            ' property must be a non empty string when specified.');
      }
      this.amv_ = /** @type {?string}*/ (amv || null);
    } else if (typeof apn !== 'undefined') {
      throw new fireauth.AuthError(
          fireauth.authenum.Error.ARGUMENT_ERROR,
          fireauth.ActionCodeSettings.AndroidRawField.PACKAGE_NAME +
          ' property must be a non empty string when specified.');
    } else if (typeof installApp !== 'undefined' ||
               typeof amv !== 'undefined') {
      // If installApp or amv specified with no valid APN, fail quickly.
      throw new fireauth.AuthError(
          fireauth.authenum.Error.MISSING_ANDROID_PACKAGE_NAME);
    }
  } else if (typeof androidSettings !== 'undefined') {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        fireauth.ActionCodeSettings.RawField.ANDROID +
        ' property must be a non null object when specified.');
  }

  // Validate iOS parameters.
  /** @private {?string} The iOS bundle ID. */
  this.ibi_ = null;
  var iosSettings = settingsObj[fireauth.ActionCodeSettings.RawField.IOS];
  if (iosSettings && typeof iosSettings === 'object') {
    var ibi = iosSettings[
      fireauth.ActionCodeSettings.IosRawField.BUNDLE_ID];
    if (typeof ibi === 'string' && ibi.length) {
      this.ibi_ = /** @type {string}*/ (ibi);
    } else if (typeof ibi !== 'undefined') {
      throw new fireauth.AuthError(
          fireauth.authenum.Error.ARGUMENT_ERROR,
          fireauth.ActionCodeSettings.IosRawField.BUNDLE_ID +
          ' property must be a non empty string when specified.');
    }
  } else if (typeof iosSettings !== 'undefined') {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        fireauth.ActionCodeSettings.RawField.IOS +
        ' property must be a non null object when specified.');
  }

  // Validate canHandleCodeInApp.
  var canHandleCodeInApp =
      settingsObj[fireauth.ActionCodeSettings.RawField.HANDLE_CODE_IN_APP];
  if (typeof canHandleCodeInApp !== 'undefined' &&
      typeof canHandleCodeInApp !== 'boolean') {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        fireauth.ActionCodeSettings.RawField.HANDLE_CODE_IN_APP +
        ' property must be a boolean when specified.');
  }
  /** @const @private {boolean} Whether the code can be handled in app. */
  this.canHandleCodeInApp_ = !!canHandleCodeInApp;

  // Validate dynamicLinkDomain.
  var dynamicLinkDomain = settingsObj[
      fireauth.ActionCodeSettings.RawField.DYNAMIC_LINK_DOMAIN];
  if (typeof dynamicLinkDomain !== 'undefined' &&
      (typeof dynamicLinkDomain !== 'string' ||
       (typeof dynamicLinkDomain === 'string' &&
        !dynamicLinkDomain.length))) {
    throw new fireauth.AuthError(
        fireauth.authenum.Error.ARGUMENT_ERROR,
        fireauth.ActionCodeSettings.RawField.DYNAMIC_LINK_DOMAIN +
        ' property must be a non empty string when specified.');
  }
  /** @const @private {?string} The FDL domain. */
  this.dynamicLinkDomain_ = dynamicLinkDomain || null;
};


/**
 * Action code settings backend request field names.
 * @enum {string}
 */
fireauth.ActionCodeSettings.RequestField = {
  ANDROID_INSTALL_APP: 'androidInstallApp',
  ANDROID_MINIMUM_VERSION: 'androidMinimumVersion',
  ANDROID_PACKAGE_NAME: 'androidPackageName',
  CAN_HANDLE_CODE_IN_APP: 'canHandleCodeInApp',
  CONTINUE_URL: 'continueUrl',
  DYNAMIC_LINK_DOMAIN: 'dynamicLinkDomain',
  IOS_BUNDLE_ID: 'iOSBundleId'
};


/**
 * Action code settings raw field names.
 * @enum {string}
 */
fireauth.ActionCodeSettings.RawField = {
  ANDROID: 'android',
  DYNAMIC_LINK_DOMAIN: 'dynamicLinkDomain',
  HANDLE_CODE_IN_APP: 'handleCodeInApp',
  IOS: 'iOS',
  URL: 'url'
};


/**
 * Action code settings raw Android raw field names.
 * @enum {string}
 */
fireauth.ActionCodeSettings.AndroidRawField = {
  INSTALL_APP: 'installApp',
  MINIMUM_VERSION: 'minimumVersion',
  PACKAGE_NAME: 'packageName'
};


/**
 * Action code settings raw iOS raw field names.
 * @enum {string}
 */
fireauth.ActionCodeSettings.IosRawField = {
  BUNDLE_ID: 'bundleId'
};


/**
 * Builds and returns the backend request for the passed action code settings.
 * @return {!Object} The constructed backend request populated with the action
 *     code settings parameters.
 */
fireauth.ActionCodeSettings.prototype.buildRequest = function() {
  // Construct backend request.
  var request = {};
  request[fireauth.ActionCodeSettings.RequestField.CONTINUE_URL] =
      this.continueUrl_;
  request[fireauth.ActionCodeSettings.RequestField.CAN_HANDLE_CODE_IN_APP] =
      this.canHandleCodeInApp_;
  request[fireauth.ActionCodeSettings.RequestField.ANDROID_PACKAGE_NAME] =
      this.apn_;
  if (this.apn_) {
    request[fireauth.ActionCodeSettings.RequestField.ANDROID_MINIMUM_VERSION] =
        this.amv_;
    request[fireauth.ActionCodeSettings.RequestField.ANDROID_INSTALL_APP] =
        this.installApp_;
  }
  request[fireauth.ActionCodeSettings.RequestField.IOS_BUNDLE_ID] = this.ibi_;
  request[fireauth.ActionCodeSettings.RequestField.DYNAMIC_LINK_DOMAIN] =
      this.dynamicLinkDomain_;
  // Remove null fields.
  for (var key in request) {
    if (request[key] === null) {
      delete request[key];
    }
  }
  return request;
};


/**
 * Returns the canHandleCodeInApp setting of ActionCodeSettings.
 * @return {boolean} Whether the code can be handled in app.
 */
fireauth.ActionCodeSettings.prototype.canHandleCodeInApp = function() {
  return this.canHandleCodeInApp_;
};
