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

const EIGHT_DAYS_IN_MS = 8 * 86400000;
const PUBLIC_VAPID_KEY =
  'BGd9sBCP946DS7oAP8XzhvbC261tTjasifBcPhsMeUFsMVH3BNW0p8l3dL0Y8OiL5db5EGru54olDK8jPXAT098';
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyA0p3wZ05sigxv1UtmLxMWP6iML_K0B-uE',
  projectId: 'android-gcm-test-519bd',
  messagingSenderId: '35006771263',
  appId: '1:35006771263:web:18cc19582bf589e8c9c88a'
};
const TAG = 'FCM_INTEGRATION_TEST: ';
const TEST_DB = 'FCM_INTEGRATION_TEST_DB';
const TEST_DB_VERSION = 1;
const BACKGROUND_MESSAGES_OBJECT_STORE = 'background_messages';
const BACKGROUND_MESSAGES_OBJECT_STORE_PRIMARY_KEY = 'ndx';
const BACKGROUND_MESSAGES_OBJECT_STORE_DEFAULT_NDX = 'default_ndx';
