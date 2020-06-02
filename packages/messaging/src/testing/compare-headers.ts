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

import { expect } from 'chai';
import '../testing/setup';

// Trick TS since it's set to target ES5.
declare class HeadersWithEntries extends Headers {
  entries?(): Iterable<[string, string]>;
}

// Chai doesn't check if Headers objects contain the same entries,
// so we need to do that manually.
export function compareHeaders(
  expectedHeaders: HeadersWithEntries,
  actualHeaders: HeadersWithEntries
): void {
  const expected = makeMap(expectedHeaders);
  const actual = makeMap(actualHeaders);
  expect(actual).to.deep.equal(expected);
}

function makeMap(headers: HeadersWithEntries): Map<string, string> {
  expect(headers.entries).not.to.be.undefined;
  return new Map(headers.entries!());
}
