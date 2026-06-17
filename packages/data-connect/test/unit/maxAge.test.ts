/**
 * @license
 * Copyright 2026 Google LLC
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

import { getMaxAgeFromExtensions } from '../../src/core/query/QueryManager';

describe('maxAge', () => {
  it('should update maxAge when server returns a different maxAge', async () => {
    const maxAge = getMaxAgeFromExtensions([
      {
        path: [],
        maxAge: '100s'
      }
    ]);
    expect(maxAge).to.equal(100);
  });

  it('should return undefined when an invalid maxAge is returned', async () => {
    const maxAge = getMaxAgeFromExtensions([
      {
        path: [],
        maxAge: 'abc'
      }
    ]);
    expect(maxAge).to.equal(undefined);
  });
});
