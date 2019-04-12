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
 * @fileoverview Defines the RecaptchaLoader interface used to load grecaptcha
 * dependencies.
 */

goog.provide('fireauth.RecaptchaLoader');


/**
 * Defines a generic interface to load grecaptcha dependencies.
 * @interface
 */
fireauth.RecaptchaLoader = function() {};


/**
 * Loads the grecaptcha client library if it is not loaded and returns a promise
 * that resolves on success. If the right conditions are available, will reload
 * the dependencies for a specified language code.
 * @param {?string} hl The reCAPTCHA language code.
 * @return {!goog.Promise<!fireauth.grecaptcha>} A promise that resolves when
 *     grecaptcha is loaded.
 */
fireauth.RecaptchaLoader.prototype.loadRecaptchaDeps =
    function(hl) {};


/** Decrements the reCAPTCHA instance counter. */
fireauth.RecaptchaLoader.prototype.clearSingleRecaptcha =
    function() {};
