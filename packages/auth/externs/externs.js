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
 * @fileoverview Firebase Auth-specific externs.
 */


/**
 * A verifier that asserts that the user calling an API is a real user.
 * @interface
 */
firebase.auth.ApplicationVerifier = function() {};


/**
 * The type of the ApplicationVerifier assertion, e.g. "recaptcha".
 * @type {string}
 */
firebase.auth.ApplicationVerifier.prototype.type;


/**
 * Returns a promise for the assertion to verify the app identity, e.g. the
 * g-recaptcha-response in reCAPTCHA.
 * @return {!firebase.Promise<string>}
 */
firebase.auth.ApplicationVerifier.prototype.verify = function() {};
