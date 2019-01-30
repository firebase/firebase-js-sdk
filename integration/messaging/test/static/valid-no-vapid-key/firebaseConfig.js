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

const config = {
  apiKey: 'AIzaSyAXe2HhleSP0eGM9sFPidWIBx7eHWlV4HM',
  authDomain: 'fcm-sdk-testing-no-vapid-key.firebaseapp.com',
  databaseURL: 'https://fcm-sdk-testing-no-vapid-key.firebaseio.com',
  projectId: 'fcm-sdk-testing-no-vapid-key',
  storageBucket: '',
  messagingSenderId: '660737059320'
};

if (this['window']) {
  window.firebaseConfig = config;
} else if (this['module']) {
  module.exports = config;
} else {
  self.firebaseConfig = config;
}
