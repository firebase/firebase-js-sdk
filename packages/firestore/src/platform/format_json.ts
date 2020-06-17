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
import { formatJSON as nodeFormatJSON } from './node/format_json';
import { formatJSON as rnFormatJSON } from './rn/format_json';
import { formatJSON as browserFormatJSON } from './browser/format_json';

/** Formats an object as a JSON string, suitable for logging. */
export function formatJSON(value: unknown): string {
  if (isNode()) {
    return nodeFormatJSON(value);
  } else if (isReactNative()) {
    return rnFormatJSON(value);
  } else {
    return browserFormatJSON(value);
  }
}
