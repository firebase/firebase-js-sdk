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

  IS_OBSERVER_HANDLED = 'isObserverHandled';

  constructor(firebaseConfig, options = {}) {
    this._clock = sinon.useFakeTimers();
    this._token = null;
    this._errors = [];
    this._messages = [];
    this._triggerDeleteToken = this.triggerDeleteToken;
    this._triggerGetToken = this.triggerGetToken;
    this._triggerTimeForward = this.triggerTimeForward;
    this._clearInstanceForTest = this.clearInstanceForTest;
    this.appendMessage = this.appendMessage;

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    this._messaging = firebase.messaging();

    if (options.vapidKey) {
      console.debug('VapidKey is provided to the test app. ');
      this._messaging.usePublicVapidKey(options.vapidKey);
    } else {
      console.debug('VapidKey is not specified. Skip setting it');
    }

    if (options.swReg) {
      console.debug('ServiceWorker is provided to the test app');
      this._messaging.useServiceWorker(options.swReg);
    } else {
      console.debug(
        'ServiceWorker is not specified. The default ServiceWorker will be used.'
      );
    }

    // subscribe foreground messages conventionally
    this._messaging.onMessage(message => {
      this.appendMessage({ ...message, IS_OBSERVER_HANDLED: false });
    });

    // subscribe foreground messages in reactive style
    this._messaging.onMessage({
      next: message => {
        this.appendMessage({ ...message, IS_OBSERVER_HANDLED: true });
      }
    });

    this._messaging.getToken().then(
      token => {
        console.log('Test app getToken() succeed. Token: ', token);
        this._token = token;
      },
      err => {
        console.log('Test app getToken() failed: ', err.message, err.stack);
        this._errors.push(err);
        this._token = null;
      }
    );
  }

  appendMessage(payload) {
    this._messages.push(payload);
  }

  async triggerDeleteToken(token) {
    try {
      await this._messaging.deleteToken(token);
      this._token = null;
      console.log('deleteToken() worked: ', token);
    } catch (e) {
      this._errors.push(e);
      console.log('deleteToken() failed: ', e.message, e.stack);
    }
  }

  async triggerGetToken() {
    try {
      this._token = await this._messaging.getToken();
      console.log('getToken() worked: ', this._token);
    } catch (e) {
      this._token = null;
      this._errors.push(e);
      console.log('getToken() failed: ', e.message, e.stack);
    }
    return this._token;
  }

  triggerTimeForward() {
    this._clock.tick(EIGHT_DAYS_IN_MS);
  }

  clearInstanceForTest() {
    this._errors = [];
    this._messages = [];
  }

  get token() {
    return this._token;
  }

  get errors() {
    return this._errors;
  }

  get messages() {
    return this._messages;
  }
}

window.DemoApp = DemoApp;
