/**
 * @license
 * Copyright 2019 Google Inc.
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
import { sleep } from './sleep';

describe('sleep', () => {
  it('returns a promise that resolves after a given amount of time', async () => {
    const t0 = performance.now();
    await sleep(100);
    const t1 = performance.now();

    // 2 ms margin of error
    expect(t1 - t0).to.be.above(98);
    expect(t1 - t0).to.be.below(102);
  });
});
