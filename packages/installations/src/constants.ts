/**
 * @license
 * Copyright 2019 Google Inc.
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

export const PENDING_TIMEOUT_MS = 10000;

export const PACKAGE_VERSION = 'w:__VERSION__'; // Will be replaced by Rollup
export const INTERNAL_AUTH_VERSION = 'FIS_v2';

export const INSTALLATIONS_API_URL =
  'https://firebaseinstallations.googleapis.com/v1';

export const TOKEN_EXPIRATION_BUFFER = 60 * 60 * 1000; // One hour

export const SERVICE = 'installations';
export const SERVICE_NAME = 'Installations';
