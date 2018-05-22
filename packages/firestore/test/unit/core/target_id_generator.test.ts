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
import { TargetIdGenerator } from '../../../src/core/target_id_generator';

describe('TargetIdGenerator', () => {
  it('can initialize with generator and seed', () => {
    expect(new TargetIdGenerator(0, 2).next()).to.equal(2);
    expect(new TargetIdGenerator(1).next()).to.equal(1);
  });

  it('rejects invalid seeds', () => {
    expect(() => new TargetIdGenerator(0, 1)).to.throw(
      'Cannot supply target ID from different generator ID'
    );
    expect(() => new TargetIdGenerator(1).after(2)).to.throw(
      'Cannot supply target ID from different generator ID'
    );
  });

  it('rejects invalid generator IDs', () => {
    expect(() => new TargetIdGenerator(3)).to.throw(
      ' Generator ID 3 contains more than 1 reserved bits'
    );
  });

  it('can increments ids', () => {
    const generator = new TargetIdGenerator(1);
    expect(generator.after(45)).to.equal(47);
    expect(generator.next()).to.equal(49);
    expect(generator.next()).to.equal(51);
    expect(generator.next()).to.equal(53);
  });

  it('can return correct generator for query cache and sync engine', () => {
    expect(TargetIdGenerator.forQueryCache().next()).to.equal(2);
    expect(TargetIdGenerator.forSyncEngine().next()).to.equal(1);
  });

  it('can return next ids', () => {
    expect(new TargetIdGenerator(1).next()).to.equal(1);
    expect(new TargetIdGenerator(1).after(-1)).to.equal(1);
    expect(new TargetIdGenerator(1).after(1)).to.equal(3);
    expect(new TargetIdGenerator(1).after(3)).to.equal(5);
    expect(new TargetIdGenerator(1).after(23)).to.equal(25);
  });
});
