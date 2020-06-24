/**
 * @license
 * Copyright 2020 Google LLC
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

// Test project managed by the FCM team
const PUBLIC_VAPID_KEY =
  'BNjjus3nz38aYtbDLVfunY3VULg0Yq5T4GXWd7iDDmeqWCUNqfrK1eiKVdoT0VncLuCjfJ1GmdfmNZz-AjHfkxM';
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBpIe0xyUNHOwtE_go32NmUJF4acsc6S6c',
  projectId: 'fcm-web-sdk-test',
  messagingSenderId: '750970317741',
  appId: '1:750970317741:web:f382be3155e250906a4f24'
};

const TAG = 'FCM_INTEGRATION_TEST: ';
const EIGHT_DAYS_IN_MS = 8 * 86400000;
const TEST_DB = 'FCM_INTEGRATION_TEST_DB';
const TEST_DB_VERSION = 1;
const BACKGROUND_MESSAGES_OBJECT_STORE = 'background_messages';
// indexDb object store creation require a "primary key", "ndx" is used.
const BACKGROUND_MESSAGES_OBJECT_STORE_PRIMARY_KEY = 'ndx';
const BACKGROUND_MESSAGES_OBJECT_STORE_DEFAULT_NDX = 'default_ndx';
