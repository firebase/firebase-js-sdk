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

import { base64 } from '@firebase/util';

// ReactNative-specific platform implementation that provides its own Base64
// encoding.
// The exports in this class must match the exports in '../platform/platform' as
// they are bundled with the browser build during the Rollup build.

export {
  loadConnection,
  newConnectivityMonitor,
  newSerializer,
  getWindow,
  getDocument
} from '../platform_browser/browser_platform';

/** Converts a Base64 encoded string to a binary string. */
export function decodeBase64(encoded: string): string {
  // WebSafe uses a different URL-encoding safe alphabet that doesn't match
  // the encoding used on the backend.
  return base64.decodeString(encoded, /* webSafe =*/ false);
}

/** Converts a binary string to a Base64 encoded string. */
export function encodeBase64(raw: string): string {
  // WebSafe uses a different URL-encoding safe alphabet that doesn't match
  // the encoding used on the backend.
  return base64.encodeString(raw, /* webSafe =*/ false);
}

/** True if and only if the Base64 conversion functions are available. */
export function isBase64Available(): boolean {
  return true;
}
