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
    this._token = null;
    this._errors = [];
    this._messages = [];

    // Initialize Firebase
    var config = {
      apiKey: 'AIzaSyA_hMf2etaedqV5eJC9Hyv7_YoA3zJIKhc',
      authDomain: 'fcm-sdk-testing.firebaseapp.com',
      databaseURL: 'https://fcm-sdk-testing.firebaseio.com',
      projectId: 'fcm-sdk-testing',
      storageBucket: 'fcm-sdk-testing.appspot.com',
      messagingSenderId: '153517668099'
    };
    firebase.initializeApp(config);

    this._messaging = firebase.messaging();

    /** this._messaging.usePublicVapidKey(
      'BJzVfWqLoALJdgV20MYy6lrj0OfhmE16PI1qLIIYx2ZZL3FoQWJJL8L0rf7rS7tqd92j_3xN3fmejKK5Eb7yMYw'
    );**/

    this._messaging.onMessage(payload => {
      console.log(`Message received: `, payload);
      this._messages.push(payload);
    });

    // Initializa state of token
    this._messaging.getToken().then(
      token => {
        console.log('getToken() worked: ', token);
        this._token = token;
      },
      err => {
        console.log('getToken() failed: ', err.message, err.stack);
        this._errors.push(err);
        this._token = null;
      }
    );
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

window.__test = new DemoApp();
