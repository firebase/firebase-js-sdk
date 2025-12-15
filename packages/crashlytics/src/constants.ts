/**
 * @license
 * Copyright 2025 Google LLC
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

/** Type constant for Firebase Crashlytics. */
export const CRASHLYTICS_TYPE = 'crashlytics';

/** Key for storing the session ID in sessionStorage. */
export const CRASHLYTICS_SESSION_ID_KEY = 'firebasecrashlytics.sessionid';

/** Keys for attributes in log entries. */
export const LOG_ENTRY_ATTRIBUTE_KEYS = {
  USER_ID: 'user.id',
  SESSION_ID: 'session.id',
  APP_VERSION: 'app.version'
};
