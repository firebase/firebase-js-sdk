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

import { Timestamp } from '../../../src/api/timestamp';
import { Code } from '../../../src/util/error';
import { addEqualityMatcher } from '../../util/equality_matcher';
import { field, wrap, wrapObject } from '../../util/helpers';

describe('Timestamp', () => {
  addEqualityMatcher();

  it('constructor should validate the "seconds" argument and store it', () => {
    expect(new Timestamp(1, 0)).toHaveProperty('seconds', 1);
    expect(new Timestamp(-62135596800, 0)).toHaveProperty(
      'seconds',
      -62135596800
    );
    expect(new Timestamp(253402300799, 0)).toHaveProperty(
      'seconds',
      253402300799
    );

    expect(() => {
      new Timestamp(-62135596801, 0);
    }).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(/seconds/),
        code: Code.INVALID_ARGUMENT
      })
    );

    expect(() => {
      new Timestamp(253402300800, 0);
    }).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(/seconds/),
        code: Code.INVALID_ARGUMENT
      })
    );
  });

  it('constructor should validate the "nanoseconds" argument and store it', () => {
    expect(new Timestamp(0, 1)).toHaveProperty('nanoseconds', 1);
    expect(new Timestamp(0, 0)).toHaveProperty('nanoseconds', 0);
    expect(new Timestamp(0, 1e9 - 1)).toHaveProperty('nanoseconds', 1e9 - 1);

    expect(() => {
      new Timestamp(0, -1);
    }).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(/nanoseconds/),
        code: Code.INVALID_ARGUMENT
      })
    );

    expect(() => {
      new Timestamp(0, 1e9);
    }).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(/nanoseconds/),
        code: Code.INVALID_ARGUMENT
      })
    );
  });

  it('fromDate', () => {
    expect(Timestamp.fromDate(new Date(1488872578916))).toEqual({
      seconds: 1488872578,
      nanoseconds: 916000000
    });

    expect(Timestamp.fromDate(new Date(-1250))).toEqual({
      seconds: -2,
      nanoseconds: 750000000
    });
  });

  it('valueOf', () => {
    expect(new Timestamp(-62135596677, 456).valueOf()).toBe(
      '000000000123.000000456'
    );
    expect(new Timestamp(-62135596800, 0).valueOf()).toBe(
      '000000000000.000000000'
    );
    expect(new Timestamp(253402300799, 1e9 - 1).valueOf()).toBe(
      '315537897599.999999999'
    );
  });

  it('arithmetic comparison of a Timestamp object to itself', () => {
    const timestamp = new Timestamp(1, 1);
    expect(timestamp < timestamp).toBe(false);
    expect(timestamp <= timestamp).toBe(true);
    expect(timestamp > timestamp).toBe(false);
    expect(timestamp >= timestamp).toBe(true);
  });

  it('arithmetic comparison of equivalent, but distinct, Timestamp objects', () => {
    const t1 = new Timestamp(1, 1);
    const t2 = new Timestamp(1, 1);
    expect(t1 < t2).toBe(false);
    expect(t1 <= t2).toBe(true);
    expect(t1 > t2).toBe(false);
    expect(t1 >= t2).toBe(true);
  });

  it('arithmetic comparison of Timestamp objects whose nanoseconds differ', () => {
    const t1 = new Timestamp(1, 1);
    const t2 = new Timestamp(1, 2);
    expect(t1 < t2).toBe(true);
    expect(t1 <= t2).toBe(true);
    expect(t1 > t2).toBe(false);
    expect(t1 >= t2).toBe(false);
  });

  it('arithmetic comparison of Timestamp objects whose seconds differ', () => {
    const t1 = new Timestamp(100, 0);
    const t2 = new Timestamp(200, 0);
    expect(t1 < t2).toBe(true);
    expect(t1 <= t2).toBe(true);
    expect(t1 > t2).toBe(false);
    expect(t1 >= t2).toBe(false);
  });

  it('arithmetic comparison of the smallest and largest Timestamp objects', () => {
    const t1 = new Timestamp(-62135596800, 0);
    const t2 = new Timestamp(253402300799, 999999999);
    expect(t1 < t2).toBe(true);
    expect(t1 <= t2).toBe(true);
    expect(t1 > t2).toBe(false);
    expect(t1 >= t2).toBe(false);
  });

  it('handles decimal inputs in fromMillis()', () => {
    const actual = Timestamp.fromMillis(1000.1);
    const expected = new Timestamp(1, 100000);
    expect(actual.isEqual(expected)).toBe(true);
  });

  it('serializes to JSON', () => {
    expect(new Timestamp(123, 456).toJSON()).toEqual({
      seconds: 123,
      nanoseconds: 456,
      type: 'firestore/timestamp/1.0'
    });
    expect(new Timestamp(0, 0).toJSON()).toEqual({
      seconds: 0,
      nanoseconds: 0,
      type: 'firestore/timestamp/1.0'
    });
    expect(new Timestamp(-123, 456).toJSON()).toEqual({
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
    expect(deserializedTimestamp).toBeDefined();
    expect(timestamp.nanoseconds).toBe(deserializedTimestamp.nanoseconds);
    expect(timestamp.seconds).toBe(deserializedTimestamp.seconds);
  });

  it('toJSON -> fromJSON timestamp comparison', () => {
    const timestamp = new Timestamp(123, 456);
    const deserializedTimestamp = Timestamp.fromJSON(timestamp.toJSON());
    expect(deserializedTimestamp.isEqual(timestamp)).toBe(true);
  });

  it('fromJSON parameter order does not matter', () => {
    const type = 'firestore/timestamp/1.0';
    const seconds = 123;
    const nanoseconds = 456;
    const control = new Timestamp(seconds, nanoseconds);
    expect(() => {
      expect(
        Timestamp.fromJSON({ seconds, nanoseconds, type }).isEqual(control)
      ).toBe(true);
    }).to.not.throw;
    expect(() => {
      expect(
        Timestamp.fromJSON({ nanoseconds, type, seconds }).isEqual(control)
      ).toBe(true);
    }).to.not.throw;
    expect(() => {
      expect(
        Timestamp.fromJSON({ type, seconds, nanoseconds }).isEqual(control)
      ).toBe(true);
    }).to.not.throw;
    expect(() => {
      expect(
        Timestamp.fromJSON({ seconds, type, nanoseconds }).isEqual(control)
      ).toBe(true);
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

  describe('Temporal Instant conversions', () => {
    let didPolyfill = false;

    beforeAll(async () => {
      if (
        typeof (globalThis as Record<string, unknown>).Temporal === 'undefined'
      ) {
        const { Temporal } = await import('@js-temporal/polyfill');
        (globalThis as Record<string, unknown>).Temporal = Temporal;
        didPolyfill = true;
      }
    });

    afterAll(() => {
      if (didPolyfill) {
        (globalThis as Record<string, unknown>).Temporal = undefined;
      }
    });

    it('fromInstant creates Timestamp correctly', () => {
      const instant =
        Temporal.Instant.fromEpochNanoseconds(1488872578916000000n);
      const ts = Timestamp.fromInstant(instant);
      expect(ts.seconds).toBe(1488872578);
      expect(ts.nanoseconds).toBe(916000000);

      const instantWithNanos =
        Temporal.Instant.fromEpochNanoseconds(1488872578916123456n);
      const ts2 = Timestamp.fromInstant(instantWithNanos);
      expect(ts2.seconds).toBe(1488872578);
      expect(ts2.nanoseconds).toBe(916123456);
    });

    it('fromInstant handles negative epoch nanoseconds', () => {
      // -1.25 seconds: seconds = -2, nanoseconds = 750000000
      const instant = Temporal.Instant.fromEpochNanoseconds(-1250000000n);
      const ts = Timestamp.fromInstant(instant);
      expect(ts.seconds).toBe(-2);
      expect(ts.nanoseconds).toBe(750000000);

      // -1 nanosecond: seconds = -1, nanoseconds = 999999999
      const instant2 = Temporal.Instant.fromEpochNanoseconds(-1n);
      const ts2 = Timestamp.fromInstant(instant2);
      expect(ts2.seconds).toBe(-1);
      expect(ts2.nanoseconds).toBe(999999999);

      // -1 second exact: seconds = -1, nanoseconds = 0
      const instant3 = Temporal.Instant.fromEpochNanoseconds(-1000000000n);
      const ts3 = Timestamp.fromInstant(instant3);
      expect(ts3.seconds).toBe(-1);
      expect(ts3.nanoseconds).toBe(0);
    });

    it('fromInstant throws for invalid input', () => {
      expect(() =>
        Timestamp.fromInstant(null as unknown as Temporal.Instant)
      ).toThrow(
        expect.objectContaining({
          message: expect.stringMatching(/Invalid Temporal.Instant/),
          code: Code.INVALID_ARGUMENT
        })
      );

      expect(() =>
        Timestamp.fromInstant(undefined as unknown as Temporal.Instant)
      ).toThrow(
        expect.objectContaining({
          message: expect.stringMatching(/Invalid Temporal.Instant/),
          code: Code.INVALID_ARGUMENT
        })
      );

      expect(() =>
        Timestamp.fromInstant({} as unknown as Temporal.Instant)
      ).toThrow(
        expect.objectContaining({
          message: expect.stringMatching(/Invalid Temporal.Instant/),
          code: Code.INVALID_ARGUMENT
        })
      );
    });

    it('toInstant returns Temporal.Instant with nanosecond precision', () => {
      const ts = new Timestamp(1488872578, 916123456);
      const instant = ts.toInstant();
      expect(instant.epochNanoseconds).toBe(1488872578916123456n);
      expect(instant.epochMilliseconds).toBe(1488872578916);
    });

    it('toInstant handles negative timestamps', () => {
      const ts = new Timestamp(-2, 750000000);
      const instant = ts.toInstant();
      expect(instant.epochNanoseconds).toBe(-1250000000n);

      const ts2 = new Timestamp(-1, 999999999);
      const instant2 = ts2.toInstant();
      expect(instant2.epochNanoseconds).toBe(-1n);
    });

    it('toInstant throws when Temporal is unavailable', () => {
      const saved = (globalThis as Record<string, unknown>).Temporal;
      delete (globalThis as Record<string, unknown>).Temporal;
      try {
        const ts = new Timestamp(100, 200);
        expect(() => ts.toInstant()).toThrow(
          expect.objectContaining({
            message: expect.stringMatching(
              /The Temporal object is not available/
            ),
            code: Code.FAILED_PRECONDITION
          })
        );
      } finally {
        (globalThis as Record<string, unknown>).Temporal = saved;
      }
    });

    it('roundtrip conversions preserve nanosecond precision', () => {
      const original = new Timestamp(123456789, 987654321);
      const instant = original.toInstant();
      const fromInst = Timestamp.fromInstant(instant);
      expect(fromInst.isEqual(original)).toBe(true);

      const negativeOriginal = new Timestamp(-62135596800, 123456789);
      const negativeInstant = negativeOriginal.toInstant();
      const fromNegativeInst = Timestamp.fromInstant(negativeInstant);
      expect(fromNegativeInst.isEqual(negativeOriginal)).toBe(true);
    });

    it('is recognized and parsed as a Timestamp value in document data', () => {
      const instant =
        Temporal.Instant.fromEpochNanoseconds(1488872578916123456n);
      const expectedTimestamp = new Timestamp(1488872578, 916123456);
      const parsed = wrap(instant);
      expect(parsed).toEqual(wrap(expectedTimestamp));

      const parsedObj = wrapObject({ createdAt: instant });
      expect(parsedObj.field(field('createdAt'))).toEqual(
        wrap(expectedTimestamp)
      );
    });
  });
});
