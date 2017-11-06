/**
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
 * @fileoverview Utilities for Auth test app features.
 */


/**
 * Initializes the widget for toggling reCAPTCHA size.
 * @param {function(string):void} callback The callback to call when the
 *     size toggler is changed, which takes in the new reCAPTCHA size.
 */
function initRecaptchaToggle(callback) {
  // Listen to recaptcha config togglers.
  var $recaptchaConfigTogglers = $('.toggleRecaptcha');
  $recaptchaConfigTogglers.click(function(e) {
    // Remove currently active option.
    $recaptchaConfigTogglers.removeClass('active');
    // Set currently selected option.
    $(this).addClass('active');
    // Get the current reCAPTCHA setting label.
    var size = $(e.target).text().toLowerCase();
    callback(size);
  });
}

// Install servicerWorker if supported.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js', {scope: '/'})
      .then(function(reg) {
        // Registration worked.
        console.log('Registration succeeded. Scope is ' + reg.scope);
      }).catch(function(error) {
        // Registration failed.
        console.log('Registration failed with ' + error.message);
      });
}
