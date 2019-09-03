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
 * @fileoverview Defines the OAuthSignInHandler interface used to start OAuth
 * sign-in flows via popup and redirect and detect incoming OAuth responses.
 */

goog.provide('fireauth.OAuthSignInHandler');

/**
 * The interface that represents an OAuth sign-in handler.
 * @interface
 */
fireauth.OAuthSignInHandler = function() {};


/**
 * @return {boolean} Whether the handler should be initialized early.
 */
fireauth.OAuthSignInHandler.prototype.shouldBeInitializedEarly = function() {};


/**
 * @return {boolean} Whether the sign-in handler in the current environment
 *     has volatile session storage.
 */
fireauth.OAuthSignInHandler.prototype.hasVolatileStorage = function() {};


/**
 * @return {!goog.Promise} The promise that resolves when the handler is
 *     initialized and ready.
 */
fireauth.OAuthSignInHandler.prototype.initializeAndWait = function() {};


/**
 * Processes the OAuth popup request. The popup instance must be provided
 * externally and on error, the requestor must close the window.
 * @param {?Window} popupWin The popup window reference.
 * @param {!fireauth.AuthEvent.Type} mode The Auth event type.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @param {function()} onInitialize The function to call on initialization.
 * @param {function(*)} onError The function to call on error.
 * @param {string=} opt_eventId The optional event ID.
 * @param {boolean=} opt_alreadyRedirected Whether popup is already redirected
 *     to final destination.
 * @param {?string=} opt_tenantId The optional tenant ID.
 * @return {!goog.Promise} The popup window promise.
 */
fireauth.OAuthSignInHandler.prototype.processPopup =
    function(popupWin, mode, provider, onInitialize, onError, opt_eventId,
             opt_alreadyRedirected, opt_tenantId) {};


/**
 * Processes the OAuth redirect request.
 * @param {!fireauth.AuthEvent.Type} mode The Auth event type.
 * @param {!fireauth.AuthProvider} provider The Auth provider to sign in with.
 * @param {?string=} opt_eventId The optional event ID.
 * @param {?string=} opt_tenantId The optional tenant ID.
 * @return {!goog.Promise}
 */
fireauth.OAuthSignInHandler.prototype.processRedirect =
    function(mode, provider, opt_eventId, opt_tenantId) {};


/**
 * @return {boolean} Whether the handler will unload the current page on
 *     redirect operations.
 */
fireauth.OAuthSignInHandler.prototype.unloadsOnRedirect = function() {};


/**
 * Waits for popup window to close. When closed start timeout listener for popup
 * pending promise. If in the process, an error is detected, the error is
 * funnelled back and the popup is closed.
 * @param {!Window} popupWin The popup window.
 * @param {!function(!fireauth.AuthError)} onError The on error callback.
 * @param {number} timeoutDuration The time to wait in ms after the popup is
 *     closed before triggering the popup closed by user error.
 * @return {!goog.Promise}
 */
fireauth.OAuthSignInHandler.prototype.startPopupTimeout =
    function(popupWin, onError, timeoutDuration) {};


/**
 * @param {!function(?fireauth.AuthEvent):boolean} listener The Auth event
 *     listener to add.
 */
fireauth.OAuthSignInHandler.prototype.addAuthEventListener =
    function(listener) {};


/**
 * @param {!function(?fireauth.AuthEvent):boolean} listener The Auth event
 *     listener to remove.
 */
fireauth.OAuthSignInHandler.prototype.removeAuthEventListener =
    function(listener) {};
