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
 * @fileoverview Defines the fireauth.storage.OAuthHandlerManager class which
 * provides utilities to the OAuth handler widget to set Auth events after an
 * IDP sign in attempt and to store state during the OAuth handshake with IDP.
 */

goog.provide('fireauth.storage.OAuthHandlerManager');

goog.require('fireauth.AuthEvent');
goog.require('fireauth.OAuthHelperState');
goog.require('fireauth.authStorage');
goog.require('fireauth.storage.AuthEventManager.Keys');


/**
 * Defines the OAuth handler storage manager. It provides methods to
 * store, load and delete OAuth handler widget state, properties and setting
 * Auth events.
 * @param {?fireauth.authStorage.Manager=} opt_manager The underlying storage
 *     manager to use. If none is provided, the default global instance is used.
 * @constructor @struct @final
 */
fireauth.storage.OAuthHandlerManager = function(opt_manager) {
  /**
   * @const @private{!fireauth.authStorage.Manager} The underlying storage
   *     manager.
   */
  this.manager_ = opt_manager || fireauth.authStorage.Manager.getInstance();
};


/**
 * Valid keys for OAuth handler manager data.
 * @private @enum {!fireauth.authStorage.Key}
 */
fireauth.storage.OAuthHandlerManager.Keys_ = {
  OAUTH_HELPER_STATE: {
    name: 'oauthHelperState',
    persistent: fireauth.authStorage.Persistence.SESSION
  },
  SESSION_ID: {
    name: 'sessionId',
    persistent: fireauth.authStorage.Persistence.SESSION
  }
};


/**
 * @param {string} appId The Auth state's application ID.
 * @return {!goog.Promise<?string|undefined>} A promise that resolves on success
 *     with the stored session ID.
 */
fireauth.storage.OAuthHandlerManager.prototype.getSessionId = function(appId) {
  return this.manager_.get(
      fireauth.storage.OAuthHandlerManager.Keys_.SESSION_ID, appId);
};


/**
 * Removes the session ID string if it exists.
 * @param {string} appId The Auth state's application ID.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.OAuthHandlerManager.prototype.removeSessionId =
    function(appId) {
  return this.manager_.remove(
      fireauth.storage.OAuthHandlerManager.Keys_.SESSION_ID, appId);
};


/**
 * Stores the session ID string.
 * @param {string} appId The Auth state's application ID.
 * @param {string} sessionId The session ID string to store.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.OAuthHandlerManager.prototype.setSessionId =
    function(appId, sessionId) {
  return this.manager_.set(
      fireauth.storage.OAuthHandlerManager.Keys_.SESSION_ID, sessionId, appId);
};


/**
 * @return {!goog.Promise<?fireauth.OAuthHelperState>} A promise that resolves
 *     on success with the stored OAuth helper state.
 */
fireauth.storage.OAuthHandlerManager.prototype.getOAuthHelperState =
    function() {
  return this.manager_.get(
      fireauth.storage.OAuthHandlerManager.Keys_.OAUTH_HELPER_STATE)
      .then(function(response) {
        return fireauth.OAuthHelperState.fromPlainObject(response);
      });
};


/**
 * Removes the current OAuth helper state if it exists.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.OAuthHandlerManager.prototype.removeOAuthHelperState =
    function() {
  return this.manager_.remove(
      fireauth.storage.OAuthHandlerManager.Keys_.OAUTH_HELPER_STATE);
};


/**
 * Stores the current OAuth helper state.
 * @param {!fireauth.OAuthHelperState} state The OAuth helper state.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.OAuthHandlerManager.prototype.setOAuthHelperState =
    function(state) {
  return this.manager_.set(
      fireauth.storage.OAuthHandlerManager.Keys_.OAUTH_HELPER_STATE,
      state.toPlainObject());
};


/**
 * Stores the Auth event for specified identifier.
 * @param {string} appId The Auth state's application ID.
 * @param {!fireauth.AuthEvent} authEvent The Auth event.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.OAuthHandlerManager.prototype.setAuthEvent =
    function(appId, authEvent) {
  return this.manager_.set(
      fireauth.storage.AuthEventManager.Keys.AUTH_EVENT,
      authEvent.toPlainObject(),
      appId);
};


/**
 * Stores the redirect Auth event for specified identifier.
 * @param {string} appId The Auth state's application ID.
 * @param {!fireauth.AuthEvent} authEvent The redirect Auth event.
 * @return {!goog.Promise<void>} A promise that resolves on success.
 */
fireauth.storage.OAuthHandlerManager.prototype.setRedirectEvent =
    function(appId, authEvent) {
  return this.manager_.set(
      fireauth.storage.AuthEventManager.Keys.REDIRECT_EVENT,
      authEvent.toPlainObject(),
      appId);
};
