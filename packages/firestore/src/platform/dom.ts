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

import { isNode, isReactNative } from '@firebase/util';
import {
  getWindow as nodeGetWindow,
  getDocument as nodeGetDocument
} from './node/dom';
import {
  getWindow as rnGetWindow,
  getDocument as rnGetDocument
} from './rn/dom';
import {
  getWindow as browserGetWindow,
  getDocument as browserGetDocument
} from './browser/dom';

/** The Platform's 'window' implementation or null if not available. */
export function getWindow(): Window | null {
  if (isNode()) {
    return nodeGetWindow();
  } else if (isReactNative()) {
    return rnGetWindow();
  } else {
    return browserGetWindow();
  }
}

/** The Platform's 'document' implementation or null if not available. */
export function getDocument(): Document | null {
  if (isNode()) {
    return nodeGetDocument();
  } else if (isReactNative()) {
    return rnGetDocument();
  } else {
    return browserGetDocument();
  }
}
