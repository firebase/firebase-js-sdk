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

import { isNode } from '@firebase/util';

// Note: We don't depend on `hardAssert` as that creates a circular reference,
// since it uses `formatJSON()` to format its log message.
if (!isNode()) {
  throw new Error(
    'The generic Platform implementation should only run under ts-node.'
  );
}

export { formatJSON } from './node/format_json';
