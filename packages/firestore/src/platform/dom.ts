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

import { isNode, isReactNative } from '@firebase/util';

import * as browser from './browser/dom';
import * as node from './node/dom';
import * as rn from './rn/dom';

/** The Platform's 'window' implementation or null if not available. */
export function getWindow(): Window | null {
  if (isNode()) {
    return node.getWindow();
  } else if (isReactNative()) {
    return rn.getWindow();
  } else {
    return browser.getWindow();
  }
}

/** The Platform's 'document' implementation or null if not available. */
export function getDocument(): Document | null {
  if (isNode()) {
    return node.getDocument();
  } else if (isReactNative()) {
    return rn.getDocument();
  } else {
    return browser.getDocument();
  }
}
