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
 * @fileoverview Defines the fireauth.storage.AuthEventManager class used by
 * the iframe to retrieve and delete Auth events triggered through an OAuth
 * flow.
 */

goog.provide('fireauth.storage.AuthEventManager');
goog.provide('fireauth.storage.AuthEventManager.Keys');

goog.require('fireauth.AuthEvent');
goog.require('fireauth.authStorage');


/**
 * Defines the Auth event storage manager. It provides methods to
 * load and delete Auth events as well as listen to external OAuth changes on
 * them.
 * @param {string} appId The Auth event's application ID.
 * @param {?fireauth.authStorage.Manager=} opt_manager The underlying storage
 *     manager to use. If none is provided, the default global instance is used.
 * @constructor @struct @final
 */
fireauth.storage.AuthEventManager = function(appId, opt_manager) {
  /** @const @private{string} appId The Auth event's application ID. */
  this.appId_ = appId;
  /**
   * @const @private{!fireauth.authStorage.Manager} The underlying storage
   *     manager.
   */
  this.manager_ = opt_manager || fireauth.authStorage.Manager.getInstance();
};


/**
 * Valid keys for Auth event manager data.
 * @enum {!fireauth.authStorage.Key}
 */
fireauth.storage.AuthEventManager.Keys = {
  AUTH_EVENT: {
    name: 'authEvent',
    persistent: fireauth.authStorage.Persistence.LOCAL
  },
  REDIRECT_EVENT: {
    name: 'redirectEvent',
    persistent: fireauth.authStorage.Persistence.SESSION
  }
};


/**
 * @return {!goog.Promise<?fireauth.AuthEvent>} A promise that resolves on
 *     success with the stored Auth event.
 */
fireauth.storage.AuthEventManager.prototype.getAuthEvent = function() {
  return this.manager_.get(
      fireauth.storage.AuthEventManager.Keys.AUTH_EVENT, this.appId_)
      .then(function(response) {
        return fireauth.AuthEvent.fromPlainObject(response);
      });
};


/**
 * Removes the identifier's Auth event if it exists.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.AuthEventManager.prototype.removeAuthEvent = function() {
  return this.manager_.remove(
      fireauth.storage.AuthEventManager.Keys.AUTH_EVENT, this.appId_);
};


/**
 * Adds a listener to Auth event for App ID provided.
 * @param {!function()} listener The listener to run on Auth event.
 */
fireauth.storage.AuthEventManager.prototype.addAuthEventListener =
    function(listener) {
  this.manager_.addListener(
      fireauth.storage.AuthEventManager.Keys.AUTH_EVENT, this.appId_, listener);
};


/**
 * Removes a listener to Auth event for App ID provided.
 * @param {!function()} listener The listener to run on Auth event.
 */
fireauth.storage.AuthEventManager.prototype.removeAuthEventListener =
    function(listener) {
  this.manager_.removeListener(
      fireauth.storage.AuthEventManager.Keys.AUTH_EVENT, this.appId_, listener);
};


/**
 * @return {!goog.Promise<?fireauth.AuthEvent>} A promise that resolves on
 *     success with the stored redirect Auth event.
 */
fireauth.storage.AuthEventManager.prototype.getRedirectEvent =
    function() {
  return this.manager_.get(
      fireauth.storage.AuthEventManager.Keys.REDIRECT_EVENT,
      this.appId_).then(function(response) {
        return fireauth.AuthEvent.fromPlainObject(response);
      });
};


/**
 * Removes the identifier's redirect Auth event if it exists.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.AuthEventManager.prototype.removeRedirectEvent = function() {
  return this.manager_.remove(
      fireauth.storage.AuthEventManager.Keys.REDIRECT_EVENT, this.appId_);
};
