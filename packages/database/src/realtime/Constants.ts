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

export const PROTOCOL_VERSION = '5';

export const VERSION_PARAM = 'v';

export const TRANSPORT_SESSION_PARAM = 's';

export const REFERER_PARAM = 'r';

export const FORGE_REF = 'f';

// Matches console.firebase.google.com, firebase-console-*.corp.google.com and
// firebase.corp.google.com
export const FORGE_DOMAIN_RE =
  /(console\.firebase|firebase-console-\w+\.corp|firebase\.corp)\.google\.com/;

export const LAST_SESSION_PARAM = 'ls';

export const APPLICATION_ID_PARAM = 'p';

export const APP_CHECK_TOKEN_PARAM = 'ac';

export const WEBSOCKET = 'websocket';

export const LONG_POLLING = 'long_polling';
