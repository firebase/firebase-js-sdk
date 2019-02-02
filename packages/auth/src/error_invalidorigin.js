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
 * @fileoverview Defines the invalid origin error, a subclass of
 * fireauth.AuthError.
 */


goog.provide('fireauth.InvalidOriginError');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('goog.Uri');
goog.require('goog.string');



/**
 * Invalid origin error that can be returned to the developer.
 * @param {string} origin The invalid domain name.
 * @constructor
 * @extends {fireauth.AuthError}
 */
fireauth.InvalidOriginError = function(origin) {
  var code = fireauth.authenum.Error.INVALID_ORIGIN;
  var message = undefined;
  var uri = goog.Uri.parse(origin);
  // Get domain.
  var domain = uri.getDomain();
  // Get scheme.
  var scheme = uri.getScheme();
  // Only http, https and chrome-extension currently supported.
  if (scheme == 'chrome-extension') {
    // Chrome extension whitelisting.
    // Replace chrome-extension://CHROME_EXT_ID in error message template.
    message = goog.string.subs(
        fireauth.InvalidOriginError.CHROME_EXTENSION_MESSAGE_TEMPLATE_,
        domain);
  } else if (scheme == 'http' || scheme == 'https') {
    // Replace domain in error message template.
    message = goog.string.subs(
        fireauth.InvalidOriginError.HTTP_MESSAGE_TEMPLATE_,
        domain);
  } else {
    // Throw operation not supported when non http, https or Chrome extension
    // protocol.
    code = fireauth.authenum.Error.OPERATION_NOT_SUPPORTED;
  }
  fireauth.InvalidOriginError.base(this, 'constructor', code, message);
};
goog.inherits(fireauth.InvalidOriginError, fireauth.AuthError);


/** @private @const {string} The http invalid origin message template. */
fireauth.InvalidOriginError.HTTP_MESSAGE_TEMPLATE_ = 'This domain (%s) is no' +
    't authorized to run this operation. Add it to the OAuth redirect domain' +
    's list in the Firebase console -> Auth section -> Sign in method tab.';


/**
 * @private @const {string} The Chrome extension invalid origin message
 *     template.
 */
fireauth.InvalidOriginError.CHROME_EXTENSION_MESSAGE_TEMPLATE_ = 'This chrom' +
    'e extension ID (chrome-extension://%s) is not authorized to run this op' +
    'eration. Add it to the OAuth redirect domains list in the Firebase cons' +
    'ole -> Auth section -> Sign in method tab.';
