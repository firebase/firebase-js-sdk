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

import { expect } from 'chai';

import { Reference } from '../src/api/Reference';

import { getRandomNode } from './helpers/util';

describe.only('get tests', () => {
  // TODO: setup spy on console.warn

  const clearRef = getRandomNode() as Reference;

  it('get should only trigger query listeners', async () => {
    const ref = getRandomNode() as Reference;
    const initial = {
      a: 1,
      b: 2
    };
    ref.set(initial);
    let valueCt = 0;
    ref.on('value', () => {
      valueCt++;
    });
    ref.limitToFirst(1).get();
    // Note: This is a real timeout, and if there is some issue with network conditions, this may fail unexpectedly
    await new Promise(resolve => setTimeout(resolve, 3000));
    expect(valueCt).to.equal(1);
  });
});
