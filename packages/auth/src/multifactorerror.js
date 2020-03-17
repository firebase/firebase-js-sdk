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
 * @fileoverview Defines the MultiFactorError class, a subclass of
 * fireauth.AuthError.
 */


goog.provide('fireauth.MultiFactorError');

goog.require('fireauth.AuthError');
goog.require('fireauth.MultiFactorResolver');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.object');
goog.require('goog.object');


/**
 * Multi-factor error with resolver, used to resolve sign-in after a two-factor
 * user signs in with a first factor and is required to prove ownership of the
 * second factor.
 * @param {!fireauth.Auth} auth The Auth instance.
 * @param {!fireauth.MultiFactorResolver.ErrorResponse} errorResponse The server
 *     error response containing the pending multi-factor credential.
 * @param {function({idToken: string, refreshToken: string}):
 *         !goog.Promise<!fireauth.AuthEventManager.Result>} onIdTokenResolver
 *     A function that takes the assertion token response and any previous
 *     information returned with the error and completes sign in with a
 *     `UserCredential`.
 * @param {string=} message The optional custom human-readable message. If not
 *     provided, a default message will be used.
 * @constructor
 * @extends {fireauth.AuthError}
 */
fireauth.MultiFactorError = function(
    auth, errorResponse, onIdTokenResolver, message) {
  fireauth.MultiFactorError.base(
      this,
      'constructor',
      fireauth.authenum.Error.MFA_REQUIRED,
      message,
      errorResponse);
  this.serverResponse_ = goog.object.clone(errorResponse);
  /**
   * @const @private {!fireauth.MultiFactorResolver} The multi-factor resolver
   *     instance.
   */
  this.resolver_ =
      new fireauth.MultiFactorResolver(auth, errorResponse, onIdTokenResolver);
  fireauth.object.setReadonlyProperty(this, 'resolver', this.resolver_);
};
goog.inherits(fireauth.MultiFactorError, fireauth.AuthError);


/**
 * Initializes a `MultiFactorError` from the plain object provided. If the
 * object is not a valid `MultiFactorError`, null is returned.
 * @param {?Object|undefined} response The object response to convert to a
 *     fireauth.MultiFactorError.
 * @param {!fireauth.Auth} auth The Auth instance.
 * @param {function({idToken: string, refreshToken: string}):
 *         !goog.Promise<!fireauth.AuthEventManager.Result>} onIdTokenResolver
 *     A function that takes the assertion token response and any previous
 *     information returned with the error and completes sign in with a
 *     `UserCredential`.
 * @return {?fireauth.MultiFactorError} The `MultiFactorError` error
 *     representation of the response. null is returned if the response is not
 *     a valid MultiFactorError plain object representation.
 */
fireauth.MultiFactorError.fromPlainObject =
    function(response, auth, onIdTokenResolver) {
  if (response &&
      goog.isObject(response['serverResponse']) &&
      response['code'] === 'auth/' + fireauth.authenum.Error.MFA_REQUIRED) {
    try {
      return new fireauth.MultiFactorError(
          auth,
          /** @type {!fireauth.MultiFactorResolver.ErrorResponse} */ (
              response['serverResponse']),
          onIdTokenResolver,
          response['message']);
    } catch (e) {
      return null;
    }
  }
  return null;
};
