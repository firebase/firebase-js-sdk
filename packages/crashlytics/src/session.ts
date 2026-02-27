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

import { CRASHLYTICS_SESSION_ID_KEY } from './constants';

/**
 * Returns the session ID stored in sessionStorage, if available.
 */
export function getSessionId(): string | undefined {
  if (typeof sessionStorage !== 'undefined') {
    try {
      return sessionStorage.getItem(CRASHLYTICS_SESSION_ID_KEY) || undefined;
    } catch (e) {
      // Ignore errors accessing sessionStorage (e.g. security restrictions)
    }
  }
}
