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
 * @fileoverview Defines the fireauth.storage.PendingRedirectManager class which
 * provides utilities to store, retrieve and delete the state of whether there
 * is a pending redirect operation previously triggered.
 */

goog.provide('fireauth.storage.PendingRedirectManager');

goog.require('fireauth.authStorage');


/**
 * Defines the pending redirect storage manager. It provides methods
 * to store, retrieve and delete the state of whether there is a pending
 * redirect operation previously triggered.
 * @param {string} appId The Auth state's application ID.
 * @param {?fireauth.authStorage.Manager=} opt_manager The underlying storage
 *     manager to use. If none is provided, the default global instance is used.
 * @constructor @struct @final
 */
fireauth.storage.PendingRedirectManager = function(appId, opt_manager) {
  /** @const @private{string} appId The Auth state's application ID. */
  this.appId_ = appId;
  /**
   * @const @private{!fireauth.authStorage.Manager} The underlying storage
   *     manager.
   */
  this.manager_ = opt_manager || fireauth.authStorage.Manager.getInstance();
};


/**
 * @const @private{!string} The pending redirect flag.
 */
fireauth.storage.PendingRedirectManager.PENDING_FLAG_ = 'pending';


/**
 * @const @private{!fireauth.authStorage.Key} The pending redirect status
 *     storage identifier key.
 */
fireauth.storage.PendingRedirectManager.PENDING_REDIRECT_KEY_ = {
  name: 'pendingRedirect',
  persistent: fireauth.authStorage.Persistence.SESSION
};


/**
 * Stores the pending redirect operation for the provided application ID.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.PendingRedirectManager.prototype.setPendingStatus =
    function() {
  return this.manager_.set(
      fireauth.storage.PendingRedirectManager.PENDING_REDIRECT_KEY_,
      fireauth.storage.PendingRedirectManager.PENDING_FLAG_,
      this.appId_);
};


/**
 * Removes the stored pending redirect operation for provided app ID.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.PendingRedirectManager.prototype.removePendingStatus =
    function() {
  return this.manager_.remove(
      fireauth.storage.PendingRedirectManager.PENDING_REDIRECT_KEY_,
      this.appId_);
};


/**
 * @return {!goog.Promise<boolean>} A promise that resolves with a boolean
 *     whether there is a pending redirect operaiton for the provided app ID.
 */
fireauth.storage.PendingRedirectManager.prototype.getPendingStatus =
    function() {
  return this.manager_.get(
      fireauth.storage.PendingRedirectManager.PENDING_REDIRECT_KEY_,
      this.appId_).then(function(response) {
        return response ==
            fireauth.storage.PendingRedirectManager.PENDING_FLAG_;
      });
};
