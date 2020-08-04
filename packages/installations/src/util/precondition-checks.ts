/**
 * @license
 * Copyright 2019 Google LLC
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

const APP_ID_IDENTIFICATION_SUBSTRING = ':';
const API_KEY_FORMAT = new RegExp('^A[\\w-]{38}$');

export function isValidAppIdFormat(appId: string): boolean {
  return appId.includes(APP_ID_IDENTIFICATION_SUBSTRING);
}

export function isValidApiKeyFormat(apiKey: string): boolean {
  return !!apiKey.match(API_KEY_FORMAT);
}
