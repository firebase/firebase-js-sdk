/**
 * @license
 * Copyright 2022 Google LLC
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

import { aggregateFieldEqual, count, sum, average } from '../../../src';

describe('aggregateFieldEqual', () => {
  it('equates two equal aggregate fields', () => {
    expect(aggregateFieldEqual(count(), count())).to.be.true;
    expect(aggregateFieldEqual(sum('foo'), sum('foo'))).to.be.true;
    expect(aggregateFieldEqual(average('bar'), average('bar'))).to.be.true;
    expect(aggregateFieldEqual(sum('foo.bar'), sum('foo.bar'))).to.be.true;
    expect(aggregateFieldEqual(average('bar.baz'), average('bar.baz'))).to.be
      .true;
  });

  it('differentiates two different aggregate fields', () => {
    expect(aggregateFieldEqual(sum('foo'), sum('bar'))).to.be.false;
    expect(aggregateFieldEqual(average('foo'), average('bar'))).to.be.false;
    expect(aggregateFieldEqual(average('foo'), sum('foo'))).to.be.false;
    expect(aggregateFieldEqual(sum('foo'), average('foo'))).to.be.false;
  });
});
