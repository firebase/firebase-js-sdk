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

'use strict';

/**
 * This class just wraps the expected behavior or a demo app that will
 * be orchestrated by selenium tests (Although manual use of the demo will
 * work, it's a secondary use case).
 */
class DemoApp {
  /**
   * The constructor will initialize the DemoApp instance with document
   * elements and initialize the Firebase app and initial state, including
   * getting the current FCM token if one is available.
   */
  constructor() {
    this._tokenElement = document.querySelector('.js-token');
    this._msgList = document.querySelector('.js-message-list');
    this._errorList = document.querySelector('.js-error-list');
    this._permissionsBtn = document.querySelector('.js-permissions');
    this._getTokenBtn = document.querySelector('.js-get-token');
    this._deleteTokenBtn = document.querySelector('.js-delete-token');
    this._dataCurlCommandElement = document.querySelector(
      '.js-data-curl-command'
    );
    this._notificationCurlCommandElement = document.querySelector(
      '.js-notification-curl-command'
    );

    this.disableAllButtons_();

    // Initialize Firebase
    var config = {
      apiKey: 'AIzaSyA_hMf2etaedqV5eJC9Hyv7_YoA3zJIKhc',
      authDomain: 'fcm-sdk-testing.firebaseapp.com',
      databaseURL: 'https://fcm-sdk-testing.firebaseio.com',
      storageBucket: 'fcm-sdk-testing.appspot.com',
      messagingSenderId: '153517668099'
    };
    firebase.initializeApp(config);

    this._messaging = firebase.messaging();
    this._messaging.onMessage(payload => {
      const liElement = document.createElement('li');
      liElement.textContent = JSON.stringify(payload);
      this._msgList.appendChild(liElement);
    });

    this.initializeBtnListeners_();

    // Initializa state of token
    this._messaging.getToken().then(
      token => {
        this.updateUI_(token);
      },
      () => {
        this.updateUI_();
      }
    );
  }

  /**
   * Configure the event listened for the buttons on the UI and
   * hook up the expected behavior.
   * @private
   */
  initializeBtnListeners_() {
    this._permissionsBtn.addEventListener('click', () => {
      this.disableAllButtons_();

      this._messaging
        .requestPermission()
        .then(() => this.updateUI_())
        .catch(err => {
          this.handleError_(err);
          this.updateUI_();
        });
    });

    this._deleteTokenBtn.addEventListener('click', () => {
      this.disableAllButtons_();

      this._messaging
        .getToken()
        .then(token => {
          if (token) {
            return this._messaging.deleteToken(token);
          }
        })
        .then(() => this.updateUI_())
        .catch(err => this.handleError_(err));
    });

    this._getTokenBtn.addEventListener('click', () => {
      this.disableAllButtons_();

      this._messaging
        .getToken()
        .then(token => this.updateUI_(token))
        .catch(err => this.handleError_(err));
    });
  }

  /**
   * This method populates the curl commands displayed on the UI. This is
   * largely helpful for manual testing and has been used by QA in the past.
   *
   * The Selenium tests do not use these.
   *
   * @private
   *
   * @param {string} token The current FCM token to use in the curl
   * requests.
   */
  populateCurlDetails_(token) {
    const serverKey = 'AIzaSyCqJkOa5awRsZ-1EyuAwU4loC3YXDBouIo';
    const endpoint = 'https://jmt17.google.com';
    const dataCurlCommand =
      `curl ` +
      `--header "Authorization: key=${serverKey}" ` +
      `--header "Content-Type: application/json" ` +
      `-d '{\"to\": \"${token}\", \"data\": {\"Hello\": \"World\"}}' ` +
      `${endpoint}/gcm/send`;
    const notificationCurlCommand =
      `curl ` +
      `--header "Authorization: key=${serverKey}" ` +
      `--header "Content-Type: application/json" ` +
      `-d '{\"to\": \"${token}\", \"notification\": ` +
      `{\"title\": \"Hello\", \"body\": \"World\", ` +
      `\"click_action\": \"https://google.com\"}}' ` +
      `${endpoint}/gcm/send`;

    this._tokenElement.textContent = token;
    this._dataCurlCommandElement.textContent = dataCurlCommand;
    this._notificationCurlCommandElement.textContent = notificationCurlCommand;
  }

  /**
   * This sets the UI state to match the current state based on
   * permissions and the current token.
   *
   * This will enable / disable buttons appropriate for the current state.
   *
   * @private
   *
   * @param {string} currentToken The current FCM token to used in the UI
   * if available.
   */
  updateUI_(currentToken) {
    switch (Notification.permission) {
      case 'granted':
        this._permissionsBtn.disabled = true;

        if (currentToken) {
          this._getTokenBtn.disabled = false;
          this._deleteTokenBtn.disabled = false;

          this.populateCurlDetails_(currentToken);
        } else {
          this._getTokenBtn.disabled = false;
          this._deleteTokenBtn.disabled = true;

          this._tokenElement.textContent = '';
          this._dataCurlCommandElement.textContent = '';
          this._notificationCurlCommandElement.textContent = '';
        }
        break;
      case 'denied':
        this.disableAllButtons_();

        this._tokenElement.textContent = '';
        this._dataCurlCommandElement.textContent = '';
        this._notificationCurlCommandElement.textContent = '';
        break;
      default:
        this._permissionsBtn.disabled = false;

        this._tokenElement.textContent = '';
        this._dataCurlCommandElement.textContent = '';
        this._notificationCurlCommandElement.textContent = '';
        break;
    }
  }

  /**
   * This method will add an error to a DOM list on the page. (Useful for QA
   * / smoke testing.)
   *
   * @private
   *
   * @param {Error} err The error to be logged onto the UI.
   */
  handleError_(err) {
    const liElement = document.createElement('li');
    liElement.textContent = JSON.stringify(err.message);
    this._errorList.appendChild(liElement);
  }

  /**
   * This method simply disables all buttons.
   *
   * @private
   */
  disableAllButtons_() {
    this._permissionsBtn.disabled = true;
    this._deleteTokenBtn.disabled = true;
    this._getTokenBtn.disabled = true;
  }
}

new DemoApp();
