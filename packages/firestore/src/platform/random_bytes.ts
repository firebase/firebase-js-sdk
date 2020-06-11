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

import * as node from '../platform_node/node_random_bytes';
import * as browser from '../platform_browser/browser_random_bytes';
import { isNode } from '@firebase/util';

// This file provides additional platform specific APIs. It acts an add on to
// "platform.ts" and exists separately to avoid circular dependency issues with
// ts-node.

/**
 * Generates `nBytes` of random bytes.
 *
 * If `nBytes < 0` , an error will be thrown.
 */
export function randomBytes(nBytes: number): Uint8Array {
  return isNode() ? node.randomBytes(nBytes) : browser.randomBytes(nBytes);
}
