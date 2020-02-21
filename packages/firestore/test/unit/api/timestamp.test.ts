/**
 * @license
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
import { Code } from '../../../src/util/error';
import { Timestamp } from '../../../src/api/timestamp';
import { addEqualityMatcher } from '../../util/equality_matcher';

describe('Timestamp', () => {
  addEqualityMatcher();

  it('constructor should validate the "seconds" argument and store it.', () => {
    expect(new Timestamp(1, 0)).to.have.property('seconds', 1);
    expect(new Timestamp(-62135596800, 0)).to.have.property(
      'seconds',
      -62135596800
    );
    expect(new Timestamp(253402300799, 0)).to.have.property(
      'seconds',
      253402300799
    );

    expect(() => {
      new Timestamp(-62135596801, 0);
    })
      .to.throw(/seconds/)
      .with.property('code', Code.INVALID_ARGUMENT);

    expect(() => {
      new Timestamp(253402300800, 0);
    })
      .to.throw(/seconds/)
      .with.property('code', Code.INVALID_ARGUMENT);
  });

  it('constructor should validate the "nanoseconds" argument and store it.', () => {
    expect(new Timestamp(0, 1)).to.have.property('nanoseconds', 1);
    expect(new Timestamp(0, 0)).to.have.property('nanoseconds', 0);
    expect(new Timestamp(0, 1e9 - 1)).to.have.property('nanoseconds', 1e9 - 1);

    expect(() => {
      new Timestamp(0, -1);
    })
      .to.throw(/nanoseconds/)
      .with.property('code', Code.INVALID_ARGUMENT);

    expect(() => {
      new Timestamp(0, 1e9);
    })
      .to.throw(/nanoseconds/)
      .with.property('code', Code.INVALID_ARGUMENT);
  });

  it('fromDate', () => {
    expect(Timestamp.fromDate(new Date(1488872578916))).to.deep.equal({
      seconds: 1488872578,
      nanoseconds: 916000000
    });

    expect(Timestamp.fromDate(new Date(-1250))).to.deep.equal({
      seconds: -2,
      nanoseconds: 750000000
    });
  });

  it('valueOf', () => {
    expect(new Timestamp(-62135596677, 456).valueOf()).to.equal(
      '000000000123.000000456'
    );
    expect(new Timestamp(-62135596800, 0).valueOf()).to.equal(
      '000000000000.000000000'
    );
    expect(new Timestamp(253402300799, 1e9 - 1).valueOf()).to.equal(
      '315537897599.999999999'
    );
  });
});
