/**
 * @license
 * Copyright 2018 Google Inc.
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
 * @fileoverview Defines the grecaptcha interface.
 */

goog.provide('fireauth.grecaptcha');


/**
 * The reCAPTCHA interface for initializing and managing visible v2
 * reCAPTCHAs as well as invisible ones.
 * @interface
 */
fireauth.grecaptcha = function() {};


/**
 * Creates a new instance of the recaptcha client.
 *
 * @param {!Element|string} elementOrId Element or element ID for the
 *     placeholder to render the reCAPTCHA client.
 * @param {!Object} params Parameters for the recaptcha client.
 * @return {number} The client ID.
 */
fireauth.grecaptcha.prototype.render = function(elementOrId, params) {};


/**
 * Resets a client with the given ID.  If an ID is not provided, resets the
 * default client.
 *
 * @param {number=} id The ID of the recaptcha client.
 * @param {?Object=} params Parameters for the recaptcha client.
 */
fireauth.grecaptcha.prototype.reset = function(id, params) {};


/**
 * Gets the response for the client with the given ID.  If an ID is not
 * provided, gets the response for the default client.
 *
 * @param {number=} id The ID of the recaptcha client.
 * @return {?string}
 */
fireauth.grecaptcha.prototype.getResponse = function(id) {};


/**
 * Programmatically triggers the invisible reCAPTCHA.
 *
 * @param {number=} opt_id The ID of the recaptcha client. Defaults to the
 *     first widget created if unspecified.
 */
fireauth.grecaptcha.prototype.execute = function(opt_id) {};
