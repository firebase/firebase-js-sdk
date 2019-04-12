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
 * @fileoverview Defines the firebase.auth.ActionCodeInfo class that is returned
 * when calling checkActionCode API and is populated from the server response
 * directly.
 */

goog.provide('fireauth.ActionCodeInfo');

goog.require('fireauth.object');


/**
 * Constructs the action code info object which provides metadata corresponding
 * to action codes. This includes the type of operation (RESET_PASSWORD,
 * VERIFY_EMAIL and RECOVER_EMAIL), the email corresponding to the operation
 * and in case of the recover email flow, the old and new email.
 * @param {!Object} response The server response for checkActionCode.
 * @constructor
 */
fireauth.ActionCodeInfo = function(response) {
  var data = {};
  // Original email for email change revocation.
  var email = response[fireauth.ActionCodeInfo.ServerFieldName.EMAIL];
  // The new email.
  var newEmail = response[fireauth.ActionCodeInfo.ServerFieldName.NEW_EMAIL];
  var operation =
      response[fireauth.ActionCodeInfo.ServerFieldName.REQUEST_TYPE];
  // Email could be empty only if the request type is EMAIL_SIGNIN.
  if (!operation ||
      (operation != fireauth.ActionCodeInfo.RequestType.EMAIL_SIGNIN &&
      !email)) {
    // This is internal only.
    throw new Error('Invalid provider user info!');
  }
  data[fireauth.ActionCodeInfo.DataField.FROM_EMAIL] = newEmail || null;
  data[fireauth.ActionCodeInfo.DataField.EMAIL] = email || null;
  fireauth.object.setReadonlyProperty(
      this,
      fireauth.ActionCodeInfo.PropertyName.OPERATION,
      operation);
  fireauth.object.setReadonlyProperty(
      this,
      fireauth.ActionCodeInfo.PropertyName.DATA,
      fireauth.object.unsafeCreateReadOnlyCopy(data));
};


/**
 * Firebase Auth Action Code Info requestType possible values.
 * @enum {string}
 */
fireauth.ActionCodeInfo.RequestType = {
  PASSWORD_RESET: 'PASSWORD_RESET',
  RECOVER_EMAIL: 'RECOVER_EMAIL',
  EMAIL_SIGNIN: 'EMAIL_SIGNIN',
  VERIFY_EMAIL: 'VERIFY_EMAIL'
};


/**
 * The checkActionCode endpoint server response field names.
 * @enum {string}
 */
fireauth.ActionCodeInfo.ServerFieldName = {
  // This is the current email of the account and in email recovery, the email
  // to revert to.
  EMAIL: 'email',
  // For email recovery, this is the new email.
  NEW_EMAIL: 'newEmail',
  // The action code request type.
  REQUEST_TYPE: 'requestType'
};


/**
 * The ActionCodeInfo data object field names.
 * @enum {string}
 */
fireauth.ActionCodeInfo.DataField = {
  EMAIL: 'email',
  FROM_EMAIL: 'fromEmail'
};


/**
 * The ActionCodeInfo main property names
 * @enum {string}
 */
fireauth.ActionCodeInfo.PropertyName = {
  DATA: 'data',
  OPERATION: 'operation'
};
