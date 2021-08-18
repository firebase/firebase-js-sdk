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
 * @fileoverview Public externs for the recaptcha javascript API.
 * @externs
 */


/**
 * The namespace for reCaptcha V2.
 *
 * https://developers.google.com/recaptcha/docs/display#js_api
 */
var grecaptcha = {};


/**
 * Creates a new instance of the recaptcha client.
 *
 * @param {(!Element|string)} elementOrId Element or element id for the
 *     placeholder to render the recaptcha client.
 * @param {!Object} params Parameters for the recaptcha client.
 * @return {number} The client id.
 */
grecaptcha.render = function(elementOrId, params) {};


/**
 * Resets a client with the given id.  If an id is not provided, resets the
 * default client.
 *
 * @param {number=} opt_id The id of the recaptcha client.
 * @param {?Object=} opt_params Parameters for the recaptcha client.
 */
grecaptcha.reset = function(opt_id, opt_params) {};


/**
 * Gets the response for the client with the given id.  If an id is not
 * provided, gets the response for the default client.
 *
 * @param {number=} opt_id The id of the recaptcha client.
 * @return {string}
 */
grecaptcha.getResponse = function(opt_id) {};


/**
 * Programmatically triggers the invisible reCAPTCHA.
 *
 * @param {number=} opt_id The id of the recaptcha client.
 */
grecaptcha.execute = function(opt_id) {};
