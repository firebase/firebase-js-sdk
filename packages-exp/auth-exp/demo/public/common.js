/**
 * @license
 * Copyright 2017 Google LLC
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
    var size = $(e.target)
      .text()
      .toLowerCase();
    callback(size);
  });
}

// Install servicerWorker if supported.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js', { scope: '/' })
    .then(function(reg) {
      // Registration worked.
      console.log('Registration succeeded. Scope is ' + reg.scope);
    })
    .catch(function(error) {
      // Registration failed.
      console.log('Registration failed with ' + error.message);
    });
}

var webWorker = null;
if (window.Worker) {
  webWorker = new Worker('/web-worker.js');
  /**
   * Handles the incoming message from the web worker.
   * @param {!Object} e The message event received.
   */
  webWorker.onmessage = function(e) {
    console.log('User data passed through web worker: ', e.data);
    switch (e.data.type) {
      case 'GET_USER_INFO':
        alertSuccess(
          'User data passed through web worker: ' + JSON.stringify(e.data)
        );
        break;
      case 'RUN_TESTS':
        if (e.data.status == 'success') {
          alertSuccess('Web worker tests ran successfully!');
        } else {
          alertError('Error: ' + JSON.stringify(e.data.error));
        }
        break;
      default:
        return;
    }
  };
}

/**
 * Asks the web worker, if supported in current browser, to return the user info
 * corresponding to the currentUser as seen within the worker.
 */
function onGetCurrentUserDataFromWebWorker() {
  if (webWorker) {
    webWorker.postMessage({ type: 'GET_USER_INFO' });
  } else {
    alertError('Error: Web workers are not supported in the current browser!');
  }
}

/**
 * Runs various Firebase Auth tests in a web worker environment and confirms the
 * expected behavior. This is useful for manual testing in different browsers.
 * @param {string} googleIdToken The Google ID token to sign in with.
 */
function runWebWorkerTests(googleIdToken) {
  if (webWorker) {
    webWorker.postMessage({
      type: 'RUN_TESTS',
      googleIdToken: googleIdToken
    });
  } else {
    alertError('Error: Web workers are not supported in the current browser!');
  }
}
