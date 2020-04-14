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

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBVqFz5vuknTmaVJyRnjxSolqhc8hXx0M4',
  authDomain: 'android-gcm-test-519bd.firebaseapp.com',
  databaseURL: 'https://android-gcm-test-519bd.firebaseio.com',
  projectId: 'android-gcm-test-519bd',
  storageBucket: 'android-gcm-test-519bd.appspot.com',
  messagingSenderId: '35006771263',
  appId: '1:35006771263:web:18cc19582bf589e8c9c88a'
};

if (this['window']) {
  window.firebaseConfig = FIREBASE_CONFIG;
} else if (this['module']) {
  module.exports = FIREBASE_CONFIG;
} else {
  self.firebaseConfig = FIREBASE_CONFIG;
}
