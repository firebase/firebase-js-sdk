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
 * @fileoverview Defines the fireauth.storage.RedirectUserManager class which
 * provides utilities to store, retrieve and delete an Auth user during a
 * redirect operation.
 */

goog.provide('fireauth.storage.RedirectUserManager');

goog.require('fireauth.AuthUser');
goog.require('fireauth.authStorage');


/**
 * Defines the Auth redirect user storage manager. It provides methods
 * to store, load and delete a user going through a link with redirect
 * operation.
 * @param {string} appId The Auth state's application ID.
 * @param {?fireauth.authStorage.Manager=} opt_manager The underlying storage
 *     manager to use. If none is provided, the default global instance is used.
 * @constructor @struct @final
 */
fireauth.storage.RedirectUserManager = function(appId, opt_manager) {
  /** @const @private{string} appId The Auth state's application ID. */
  this.appId_ = appId;
  /**
   * @const @private{!fireauth.authStorage.Manager} The underlying storage
   *     manager.
   */
  this.manager_ = opt_manager || fireauth.authStorage.Manager.getInstance();
};


/**
 * @const @private{!fireauth.authStorage.Key} The Auth redirect user storage
 *     identifier.
 */
fireauth.storage.RedirectUserManager.REDIRECT_USER_KEY_ = {
  name: 'redirectUser',
  persistent: fireauth.authStorage.Persistence.SESSION
};


/**
 * Stores the user being redirected for the provided application ID.
 * @param {!fireauth.AuthUser} redirectUser The user being redirected.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.RedirectUserManager.prototype.setRedirectUser =
    function(redirectUser) {
  return this.manager_.set(
      fireauth.storage.RedirectUserManager.REDIRECT_USER_KEY_,
      redirectUser.toPlainObject(),
      this.appId_);
};


/**
 * Removes the stored redirected user for provided app ID.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.RedirectUserManager.prototype.removeRedirectUser =
    function() {
  return this.manager_.remove(
      fireauth.storage.RedirectUserManager.REDIRECT_USER_KEY_, this.appId_);
};


/**
 * @param {?string=} opt_authDomain The optional Auth domain to override if
 *     provided.
 * @return {!goog.Promise<?fireauth.AuthUser>} A promise that resolves with
 *     the stored redirected user for the provided app ID.
 */
fireauth.storage.RedirectUserManager.prototype.getRedirectUser =
    function(opt_authDomain) {
  return this.manager_.get(
      fireauth.storage.RedirectUserManager.REDIRECT_USER_KEY_, this.appId_)
      .then(function(response) {
        // If potential user saved, override Auth domain if authDomain is
        // provided.
        if (response && opt_authDomain) {
          response['authDomain'] = opt_authDomain;
        }
        return fireauth.AuthUser.fromPlainObject(response || {});
      });
};
