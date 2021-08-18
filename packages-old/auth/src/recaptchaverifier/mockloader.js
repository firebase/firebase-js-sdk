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
 * @fileoverview Defines the RecaptchaLoader implementation used to mock loading
 * of grecaptcha dependencies.
 */

goog.provide('fireauth.RecaptchaMockLoader');

goog.require('fireauth.GRecaptchaMockFactory');
goog.require('fireauth.RecaptchaLoader');
goog.require('goog.Promise');


/**
 * Defines a mock reCAPTCHA loader by implementing the fireauth.RecaptchaLoader
 * interface.
 * @constructor
 * @implements {fireauth.RecaptchaLoader}
 */
fireauth.RecaptchaMockLoader = function() {};


/**
 * Loads the grecaptcha mock library if it is not loaded and returns a promise
 * that resolves on success. If the right conditions are available, will reload
 * the dependencies for a specified language code.
 * @param {?string} hl The reCAPTCHA language code.
 * @return {!goog.Promise<!fireauth.grecaptcha>} A promise that resolves when
 *     grecaptcha is loaded.
 * @override
 */
fireauth.RecaptchaMockLoader.prototype.loadRecaptchaDeps =
    function(hl) {
  return goog.Promise.resolve(
  	/** @type {!fireauth.grecaptcha} */ (fireauth.GRecaptchaMockFactory.getInstance()));
};


/**
 * Decrements the reCAPTCHA instance counter.
 * @override
 */
fireauth.RecaptchaMockLoader.prototype.clearSingleRecaptcha =
    function() {};


/**
 * @private {?fireauth.RecaptchaMockLoader} The singleton instance
 *     for the mock reCAPTCHA dependency loader.
 */
fireauth.RecaptchaMockLoader.instance_ = null;


/**
 * @return {!fireauth.RecaptchaMockLoader} The singleton mock reCAPTCHA
 *     dependency loader instance.
 */
fireauth.RecaptchaMockLoader.getInstance = function() {
  // Check if there is an existing instance. Otherwise create one and cache it.
  if (!fireauth.RecaptchaMockLoader.instance_) {
    fireauth.RecaptchaMockLoader.instance_ =
        new fireauth.RecaptchaMockLoader();
  }
  return fireauth.RecaptchaMockLoader.instance_;
};
