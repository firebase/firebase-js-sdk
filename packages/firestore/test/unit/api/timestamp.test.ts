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

import { Timestamp } from '../../../src/api/timestamp';
import { Code } from '../../../src/util/error';
import { addEqualityMatcher } from '../../util/equality_matcher';

describe('Timestamp', () => {
  addEqualityMatcher();

  it('constructor should validate the "seconds" argument and store it', () => {
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

  it('constructor should validate the "nanoseconds" argument and store it', () => {
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

  it('arithmetic comparison of a Timestamp object to itself', () => {
    const timestamp = new Timestamp(1, 1);
    expect(timestamp < timestamp).to.be.false;
    expect(timestamp <= timestamp).to.be.true;
    expect(timestamp > timestamp).to.be.false;
    expect(timestamp >= timestamp).to.be.true;
  });

  it('arithmetic comparison of equivalent, but distinct, Timestamp objects', () => {
    const t1 = new Timestamp(1, 1);
    const t2 = new Timestamp(1, 1);
    expect(t1 < t2).to.be.false;
    expect(t1 <= t2).to.be.true;
    expect(t1 > t2).to.be.false;
    expect(t1 >= t2).to.be.true;
  });

  it('arithmetic comparison of Timestamp objects whose nanoseconds differ', () => {
    const t1 = new Timestamp(1, 1);
    const t2 = new Timestamp(1, 2);
    expect(t1 < t2).to.be.true;
    expect(t1 <= t2).to.be.true;
    expect(t1 > t2).to.be.false;
    expect(t1 >= t2).to.be.false;
  });

  it('arithmetic comparison of Timestamp objects whose seconds differ', () => {
    const t1 = new Timestamp(100, 0);
    const t2 = new Timestamp(200, 0);
    expect(t1 < t2).to.be.true;
    expect(t1 <= t2).to.be.true;
    expect(t1 > t2).to.be.false;
    expect(t1 >= t2).to.be.false;
  });

  it('arithmetic comparison of the smallest and largest Timestamp objects', () => {
    const t1 = new Timestamp(-62135596800, 0);
    const t2 = new Timestamp(253402300799, 999999999);
    expect(t1 < t2).to.be.true;
    expect(t1 <= t2).to.be.true;
    expect(t1 > t2).to.be.false;
    expect(t1 >= t2).to.be.false;
  });

  it('handles decimal inputs in fromMillis()', () => {
    const actual = Timestamp.fromMillis(1000.1);
    const expected = new Timestamp(1, 100000);
    expect(actual.isEqual(expected)).to.be.true;
  });

  it('serializes to JSON', () => {
    expect(new Timestamp(123, 456).toJSON()).to.deep.equal({
      seconds: 123,
      nanoseconds: 456,
      type: 'firestore/timestamp/1.0'
    });
    expect(new Timestamp(0, 0).toJSON()).to.deep.equal({
      seconds: 0,
      nanoseconds: 0,
      type: 'firestore/timestamp/1.0'
    });
    expect(new Timestamp(-123, 456).toJSON()).to.deep.equal({
      seconds: -123,
      nanoseconds: 456,
      type: 'firestore/timestamp/1.0'
    });
  });

  it('fromJSON does not throw', () => {
    const timestamp = new Timestamp(123, 456);
    expect(() => {
      Timestamp.fromJSON(timestamp.toJSON());
    }).to.not.throw;
  });

  it('fromJSON reconstructs seconds and nanoseconds', () => {
    const timestamp = new Timestamp(123, 456);
    const deserializedTimestamp = Timestamp.fromJSON(timestamp.toJSON());
    expect(deserializedTimestamp).to.exist;
    expect(timestamp.nanoseconds).to.equal(deserializedTimestamp.nanoseconds);
    expect(timestamp.seconds).to.equal(deserializedTimestamp.seconds);
  });

  it('toJSON -> fromJSON timestamp comparison', () => {
    const timestamp = new Timestamp(123, 456);
    const deserializedTimestamp = Timestamp.fromJSON(timestamp.toJSON());
    expect(deserializedTimestamp.isEqual(timestamp)).to.be.true;
  });

  it('fromJSON parameter order does not matter', () => {
    const type = 'firestore/timestamp/1.0';
    const seconds = 123;
    const nanoseconds = 456;
    const control = new Timestamp(seconds, nanoseconds);
    expect(() => {
      expect(
        Timestamp.fromJSON({ seconds, nanoseconds, type }).isEqual(control)
      ).to.be.true;
    }).to.not.throw;
    expect(() => {
      expect(
        Timestamp.fromJSON({ nanoseconds, type, seconds }).isEqual(control)
      ).to.be.true;
    }).to.not.throw;
    expect(() => {
      expect(
        Timestamp.fromJSON({ type, seconds, nanoseconds }).isEqual(control)
      ).to.be.true;
    }).to.not.throw;
    expect(() => {
      expect(
        Timestamp.fromJSON({ seconds, type, nanoseconds }).isEqual(control)
      ).to.be.true;
    }).to.not.throw;
  });

  it('fromJSON missing fields throws', () => {
    const type = 'firestore/timestamp/1.0';
    const seconds = 123;
    const nanoseconds = 456;

    expect(() => {
      Timestamp.fromJSON({ type, seconds });
    }).to.throw;
    expect(() => {
      Timestamp.fromJSON({ type, nanoseconds });
    }).to.throw;
    expect(() => {
      Timestamp.fromJSON({ seconds, nanoseconds });
    }).to.throw;
  });

  it('fromJSON field errant field type throws', () => {
    const type = 'firestore/timestamp/1.0';
    const seconds = 123;
    const nanoseconds = 456;

    expect(() => {
      Timestamp.fromJSON({ type, seconds, nanoseconds: 'wrong' });
    }).to.throw;
    expect(() => {
      Timestamp.fromJSON({ type, nanoseconds, seconds: 'wrong' });
    }).to.throw;
    expect(() => {
      Timestamp.fromJSON({ seconds, nanoseconds, type: 1 });
    }).to.throw;
    expect(() => {
      Timestamp.fromJSON({ seconds, nanoseconds, type: 'firestore/wrong/1.0' });
    }).to.throw;
  });
});
