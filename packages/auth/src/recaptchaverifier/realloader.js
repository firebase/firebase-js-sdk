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
 * @fileoverview Defines the RecaptchaLoader implementation used to load all
 * the grecaptcha dependencies.
 */

goog.provide('fireauth.RecaptchaRealLoader');

goog.require('fireauth.AuthError');
goog.require('fireauth.RecaptchaLoader');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.html.TrustedResourceUrl');
goog.require('goog.net.jsloader');
goog.require('goog.string.Const');


/**
 * Utility to help load reCAPTCHA dependencies for specified languages.
 * @constructor
 * @implements {fireauth.RecaptchaLoader}
 */
fireauth.RecaptchaRealLoader = function() {
  /**
   * @private {number} The reCAPTCHA instance counter. This is used to track the
   *     number of reCAPTCHAs rendered on the page. This is needed to allow
   *     localization of the reCAPTCHA. Localization is applied by loading the
   *     grecaptcha SDK with the hl field provided. However, this will break
   *     existing reCAPTCHAs. So we should only support i18n when there are no
   *     other widgets rendered on this screen. If the developer is already
   *     using reCAPTCHA in another context, we will disable localization so we
   *     don't accidentally break existing reCAPTCHA widgets.
   */
  this.counter_ = goog.global['grecaptcha'] ? Infinity : 0;
  /** @private {?string} The current reCAPTCHA language code. */
  this.hl_ = null;
  /** @const @private {string} The reCAPTCHA callback name. */
  this.cbName_ = '__rcb' + Math.floor(Math.random() * 1000000).toString();
};


/** @private @const {!goog.string.Const} The reCAPTCHA javascript source URL. */
fireauth.RecaptchaRealLoader.RECAPTCHA_SRC_ = goog.string.Const.from(
    'https://www.google.com/recaptcha/api.js?onload=%{onload}&render=explicit' +
    '&hl=%{hl}');


/**
 * The default timeout delay (units in milliseconds) for requests loading
 * the external reCAPTCHA dependencies.
 * @const {!fireauth.util.Delay}
 * @private
 */
fireauth.RecaptchaRealLoader.DEFAULT_DEPENDENCY_TIMEOUT_ =
    new fireauth.util.Delay(30000, 60000);


/**
 * Loads the grecaptcha client library if it is not loaded and returns a promise
 * that resolves on success. If the right conditions are available, will reload
 * the dependencies for a specified language code.
 * @param {?string} hl The reCAPTCHA language code.
 * @return {!goog.Promise<!fireauth.grecaptcha>} A promise that resolves when
 *     grecaptcha is loaded.
 * @override
 */
fireauth.RecaptchaRealLoader.prototype.loadRecaptchaDeps =
    function(hl) {
  var self = this;
  return new goog.Promise(function(resolve, reject) {
    var timer = setTimeout(
        function() {
          reject(new fireauth.AuthError(
              fireauth.authenum.Error.NETWORK_REQUEST_FAILED));
        },
        fireauth.RecaptchaRealLoader.DEFAULT_DEPENDENCY_TIMEOUT_
            .get()
    );
    // Load grecaptcha SDK if not already loaded or language changed since last
    // load and no other rendered reCAPTCHA is visible,
    if (!goog.global['grecaptcha'] || (hl !== self.hl_ && !self.counter_)) {
      // reCAPTCHA saves the onload function and applies it on subsequent
      // reloads. This means that the callback name has to remain the same.
      goog.global[self.cbName_] = function() {
        if (!goog.global['grecaptcha']) {
          clearTimeout(timer);
          // This should not happen.
          reject(new fireauth.AuthError(
              fireauth.authenum.Error.INTERNAL_ERROR));
        } else {
          // Update the current language code.
          self.hl_ = hl;
          var render = goog.global['grecaptcha']['render'];
          // Wrap grecaptcha.render to keep track of rendered grecaptcha. This
          // helps detect if the developer rendered a non
          // firebase.auth.RecaptchaVerifier reCAPTCHA.
          goog.global['grecaptcha']['render'] =
              function(container, parameters) {
            var widgetId = render(container, parameters);
            // Increment only after render succeeds, in case an error is thrown
            // during rendering.
            self.counter_++;
            return widgetId;
          };
          clearTimeout(timer);
          resolve(goog.global['grecaptcha']);
        }
        delete goog.global[self.cbName_];
      };
      // Construct reCAPTCHA URL and on load, run the temporary function.
      var url = goog.html.TrustedResourceUrl.format(
          fireauth.RecaptchaRealLoader.RECAPTCHA_SRC_,
          {'onload': self.cbName_, 'hl': hl || ''});
      // TODO: eventually, replace all dependencies on goog.net.jsloader.
      goog.Promise.resolve(goog.net.jsloader.safeLoad(url))
          .thenCatch(function(error) {
            clearTimeout(timer);
            // In case library fails to load, typically due to a network error,
            // reset cached loader to null to force a refresh on a retrial.
            reject(new fireauth.AuthError(
                fireauth.authenum.Error.INTERNAL_ERROR,
                'Unable to load external reCAPTCHA dependencies!'));
          });
    } else {
      clearTimeout(timer);
      resolve(goog.global['grecaptcha']);
    }
  });
};


/**
 * Decrements the reCAPTCHA instance counter.
 * @override
 */
fireauth.RecaptchaRealLoader.prototype.clearSingleRecaptcha =
    function() {
  this.counter_--;
};


/**
 * @private {?fireauth.RecaptchaRealLoader} The singleton instance
 *     for reCAPTCHA dependency loader.
 */
fireauth.RecaptchaRealLoader.instance_ = null;


/**
 * @return {!fireauth.RecaptchaRealLoader} The singleton reCAPTCHA
 *     dependency loader instance.
 */
fireauth.RecaptchaRealLoader.getInstance = function() {
  // Check if there is an existing instance. Otherwise create one and cache it.
  if (!fireauth.RecaptchaRealLoader.instance_) {
    fireauth.RecaptchaRealLoader.instance_ =
        new fireauth.RecaptchaRealLoader();
  }
  return fireauth.RecaptchaRealLoader.instance_;
};
