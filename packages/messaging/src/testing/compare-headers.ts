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

// Headers objects do not expose enumerable properties for direct comparison,
// so we need to compare their entries manually via Maps.
export function compareHeaders(
  expectedHeaders: Headers,
  actualHeaders: Headers
): void {
  const expected = makeMap(expectedHeaders);
  const actual = makeMap(actualHeaders);
  expect(actual).toEqual(expected);
}

function makeMap(headers: Headers): Map<string, string> {
  expect(headers.entries).not.toBeUndefined();
  return new Map(headers.entries());
}
