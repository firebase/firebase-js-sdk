/**
 * Copyright 2017 Google Inc.
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
import { TargetIdGenerator } from '../../../../src/firestore/core/target_id_generator';

describe('TargetIdGenerator', () => {
  it('can initialize with increment and "after value"', () => {
    expect(new TargetIdGenerator(0).next()).to.equal(2);
    expect(new TargetIdGenerator(1).next()).to.equal(1);

    expect(new TargetIdGenerator(1, -1).next()).to.equal(1);
    expect(new TargetIdGenerator(1, 2).next()).to.equal(3);
    expect(new TargetIdGenerator(1, 4).next()).to.equal(5);
    expect(new TargetIdGenerator(1, 23).next()).to.equal(25);
  });

  it('can increments ids', () => {
    const generator = new TargetIdGenerator(1, 46);
    expect(generator.next()).to.equal(47);
    expect(generator.next()).to.equal(49);
    expect(generator.next()).to.equal(51);
    expect(generator.next()).to.equal(53);
  });

  it('can return correct generator for local store and sync engine', () => {
    expect(TargetIdGenerator.forLocalStore().next()).to.equal(2);
    expect(TargetIdGenerator.forSyncEngine().next()).to.equal(1);
  });
});
