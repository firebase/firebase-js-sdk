/**
 * @license
 * Copyright 2025 Google LLC
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

import { isSafariOrWebkit } from '@firebase/util';

import { Timestamp } from '../../../../src';
import {
  constant,
  Expression,
  subtract,
  timestampToUnixMicros,
  timestampToUnixMillis,
  timestampToUnixSeconds,
  unixMicrosToTimestamp,
  unixMillisToTimestamp,
  unixSecondsToTimestamp
} from '../../../../src/lite-api/expressions';

import { evaluateToValue, expectEqualToConstant } from './utils';

function constantInt(valueStr: string): Expression {
  const c = constant(0);
  (c as unknown as { _protoValue: { integerValue: string } })._protoValue = {
    integerValue: valueStr
  };
  return c;
}

describe('Timestamp Functions', () => {
  describe('UnixMicrosToTimestamp', () => {
    it('stringType_returnsError', () => {
      expect(
        evaluateToValue(unixMicrosToTimestamp(constant('abc')))
      ).toBeUndefined();
    });

    it('zeroValue_returnsTimestampEpoch', () => {
      const result = evaluateToValue(unixMicrosToTimestamp(constant(0)));
      expect(result?.timestampValue).toEqual({
        seconds: 0,
        nanos: 0
      });
    });

    it('intType_returnsTimestamp', () => {
      const result = evaluateToValue(unixMicrosToTimestamp(constant(1000000)));
      expect(result?.timestampValue).toEqual({
        seconds: 1,
        nanos: 0
      });
    });

    it('longType_returnsTimestamp', () => {
      const result = evaluateToValue(
        unixMicrosToTimestamp(constant(9876543210))
      );
      expect(result?.timestampValue).toEqual({
        seconds: 9876,
        nanos: 543210000
      });
    });

    it('longType_negative_returnsTimestamp', () => {
      const result = evaluateToValue(unixMicrosToTimestamp(constant(-10000)));
      expect(result?.timestampValue).toEqual({
        seconds: -1,
        nanos: 990000000
      });
    });

    it('longType_negative_overflow_returnsError', () => {
      const result1 = evaluateToValue(
        unixMicrosToTimestamp(constantInt('-62135596800000000'))
      );
      expect(result1?.timestampValue).toEqual({
        seconds: -62135596800,
        nanos: 0
      });

      const result2 = evaluateToValue(
        unixMicrosToTimestamp(
          subtract(constantInt('-62135596800000000'), constant(1))
        )
      );
      expect(result2).toEqual(undefined);
    });

    it('longType_positive_overflow_returnsError', () => {
      const result1 = evaluateToValue(
        unixMicrosToTimestamp(
          subtract(constantInt('253402300800000000'), constant(1))
        )
      );
      expect(result1?.timestampValue).toEqual({
        seconds: 253402300799,
        nanos: 999999000
      });

      const result2 = evaluateToValue(
        unixMicrosToTimestamp(constantInt('253402300800000000'))
      );
      expect(result2).toEqual(undefined);
    });
  });

  describe('UnixMillisToTimestamp', () => {
    it('stringType_returnsError', () => {
      expect(
        evaluateToValue(unixMillisToTimestamp(constant('abc')))
      ).toBeUndefined();
    });

    it('zeroValue_returnsTimestampEpoch', () => {
      const result = evaluateToValue(unixMillisToTimestamp(constant(0)));
      expect(result?.timestampValue).toEqual({
        seconds: 0,
        nanos: 0
      });
    });

    it('intType_returnsTimestamp', () => {
      const result = evaluateToValue(unixMillisToTimestamp(constant(1000)));
      expect(result?.timestampValue).toEqual({
        seconds: 1,
        nanos: 0
      });
    });

    it('longType_returnsTimestamp', () => {
      const result = evaluateToValue(
        unixMillisToTimestamp(constant(9876543210))
      );
      expect(result?.timestampValue).toEqual({
        seconds: 9876543,
        nanos: 210000000
      });
    });

    it('longType_negative_returnsTimestamp', () => {
      const result = evaluateToValue(unixMillisToTimestamp(constant(-10000)));
      expect(result?.timestampValue).toEqual({
        seconds: -10,
        nanos: 0
      });
    });

    it('longType_negative_overflow_returnsError', () => {
      const result1 = evaluateToValue(
        unixMillisToTimestamp(
          constant(-62135596800000, {
            preferIntegers: true
          })
        )
      );
      expect(result1?.timestampValue).toEqual({
        seconds: -62135596800,
        nanos: 0
      });

      const result2 = evaluateToValue(
        unixMillisToTimestamp(
          constant(-62135596800001, {
            preferIntegers: true
          })
        )
      );
      expect(result2).toEqual(undefined);
    });

    it('longType_positive_overflow_returnsError', () => {
      const result1 = evaluateToValue(
        unixMillisToTimestamp(
          constant(253402300799999, {
            preferIntegers: true
          })
        )
      );
      expect(result1?.timestampValue).toEqual({
        seconds: 253402300799,
        nanos: 999000000
      });

      const result2 = evaluateToValue(
        unixMillisToTimestamp(
          constant(253402300800000, {
            preferIntegers: true
          })
        )
      );
      expect(result2).toEqual(undefined);
    });
  });

  describe('UnixSecondsToTimestamp', () => {
    it('stringType_returnsError', () => {
      expect(
        evaluateToValue(unixSecondsToTimestamp(constant('abc')))
      ).toBeUndefined();
    });

    it('zeroValue_returnsTimestampEpoch', () => {
      const result = evaluateToValue(unixSecondsToTimestamp(constant(0)));
      expect(result?.timestampValue).toEqual({
        seconds: 0,
        nanos: 0
      });
    });

    it('intType_returnsTimestamp', () => {
      const result = evaluateToValue(unixSecondsToTimestamp(constant(1)));
      expect(result?.timestampValue).toEqual({
        seconds: 1,
        nanos: 0
      });
    });

    it('longType_returnsTimestamp', () => {
      const result = evaluateToValue(
        unixSecondsToTimestamp(constant(9876543210))
      );
      expect(result?.timestampValue).toEqual({
        seconds: 9876543210,
        nanos: 0
      });
    });

    it('longType_negative_returnsTimestamp', () => {
      const result = evaluateToValue(unixSecondsToTimestamp(constant(-10000)));
      expect(result?.timestampValue).toEqual({
        seconds: -10000,
        nanos: 0
      });
    });

    it('longType_negative_overflow_returnsError', () => {
      const result1 = evaluateToValue(
        unixSecondsToTimestamp(
          constant(-62135596800, {
            preferIntegers: true
          })
        )
      );
      expect(result1?.timestampValue).toEqual({
        seconds: -62135596800,
        nanos: 0
      });

      const result2 = evaluateToValue(
        unixSecondsToTimestamp(
          constant(-62135596801, {
            preferIntegers: true
          })
        )
      );
      expect(result2).toEqual(undefined);
    });

    it('longType_positive_overflow_returnsError', () => {
      const result1 = evaluateToValue(
        unixSecondsToTimestamp(
          constant(253402300799, {
            preferIntegers: true
          })
        )
      );
      expect(result1?.timestampValue).toEqual({
        seconds: 253402300799,
        nanos: 0
      });

      const result2 = evaluateToValue(
        unixSecondsToTimestamp(
          constant(253402300800, {
            preferIntegers: true
          })
        )
      );
      expect(result2).toEqual(undefined);
    });
  });

  describe('TimestampToUnixMicros', () => {
    it('nonTimestampType_returnsError', () => {
      expect(
        evaluateToValue(timestampToUnixMicros(constant(123)))
      ).toBeUndefined();
    });

    it('timestamp_returnsMicros', () => {
      const timestamp = new Timestamp(347068800, 0);
      const result = evaluateToValue(
        timestampToUnixMicros(constant(timestamp))
      );
      expect(result?.integerValue).toBe('347068800000000');
    });

    it('epochTimestamp_returnsMicros', () => {
      const timestamp = new Timestamp(0, 0);
      const result = evaluateToValue(
        timestampToUnixMicros(constant(timestamp))
      );
      expect(result?.integerValue).toBe('0');
    });

    it('currentTimestamp_returnsMicros', () => {
      const now = Timestamp.now();
      const result = evaluateToValue(timestampToUnixMicros(constant(now)));
      expect(result?.integerValue).toBe(
        (BigInt(now.toMillis()) * BigInt(1000)).toString()
      );
    });

    // Skipped in Safari/WebKit due to year 10,000 boundary floating-point precision overflow
    it.skipIf(isSafariOrWebkit())('maxTimestamp_returnsMicros', () => {
      const maxTimestamp = new Timestamp(253402300799, 999999999);
      const result = evaluateToValue(
        timestampToUnixMicros(constant(maxTimestamp))
      );
      expect(result?.integerValue).toBe('253402300799999999');
    });

    it('minTimestamp_returnsMicros', () => {
      const minTimestamp = new Timestamp(-62135596800, 0);
      const result = evaluateToValue(
        timestampToUnixMicros(constant(minTimestamp))
      );
      expect(result?.integerValue).toBe('-62135596800000000');
    });

    it('timestampOverflow_returnsError', () => {
      expect(
        evaluateToValue(
          timestampToUnixMicros(
            constant({
              timestampValue: {
                seconds: Number.MAX_SAFE_INTEGER,
                nanos: 999999999
              }
            })
          )
        )
      ).toBeUndefined();
    });

    // Skipped in Safari/WebKit due to pre-epoch negative sub-second truncation quirk
    it.skipIf(isSafariOrWebkit())('timestampTruncatesToMicros', () => {
      const timestamp = new Timestamp(-1, 999999999);
      const result = evaluateToValue(
        timestampToUnixMicros(constant(timestamp))
      );
      expect(result?.integerValue).toBe('-1');
    });
  });

  describe('TimestampToUnixMillisFunction', () => {
    it('nonTimestampType_returnsError', () => {
      expect(
        evaluateToValue(timestampToUnixMillis(constant(123)))
      ).toBeUndefined();
    });

    it('timestamp_returnsMillis', () => {
      const timestamp = new Timestamp(347068800, 0);
      const result = evaluateToValue(
        timestampToUnixMillis(constant(timestamp))
      );
      expect(result?.integerValue).toBe('347068800000');
    });

    it('epochTimestamp_returnsMillis', () => {
      const timestamp = new Timestamp(0, 0);
      const result = evaluateToValue(
        timestampToUnixMillis(constant(timestamp))
      );
      expect(result?.integerValue).toBe('0');
    });

    it('currentTimestamp_returnsMillis', () => {
      const now = Timestamp.now();
      const result = evaluateToValue(timestampToUnixMillis(constant(now)));
      expect(result?.integerValue).toBe(now.toMillis().toString());
    });

    it('maxTimestamp_returnsMillis', () => {
      const maxTimestamp = new Timestamp(253402300799, 999000000);
      const result = evaluateToValue(
        timestampToUnixMillis(constant(maxTimestamp))
      );
      expect(result?.integerValue).toBe('253402300799999');
    });

    it('minTimestamp_returnsMillis', () => {
      const minTimestamp = new Timestamp(-62135596800, 0);
      const result = evaluateToValue(
        timestampToUnixMillis(constant(minTimestamp))
      );
      expect(result?.integerValue).toBe('-62135596800000');
    });

    // Skipped in Safari/WebKit due to pre-epoch negative sub-second truncation quirk
    it.skipIf(isSafariOrWebkit())('timestampTruncatesToMillis', () => {
      const timestamp = new Timestamp(-1, 999999999);
      const result = evaluateToValue(
        timestampToUnixMillis(constant(timestamp))
      );
      expect(result?.integerValue).toBe('-1');
    });

    it('timestampOverflow_returnsError', () => {
      expect(
        evaluateToValue(
          timestampToUnixMillis(
            constant({
              timestampValue: {
                seconds: Number.MAX_SAFE_INTEGER,
                nanos: 999999999
              }
            })
          )
        )
      ).toBeUndefined();
    });
  });

  describe('TimestampToUnixSecondsFunctionTest', () => {
    it('nonTimestampType_returnsError', () => {
      expect(
        evaluateToValue(timestampToUnixSeconds(constant(123)))
      ).toBeUndefined();
    });

    it('timestamp_returnsSeconds', () => {
      const timestamp = new Timestamp(347068800, 0);
      const result = evaluateToValue(
        timestampToUnixSeconds(constant(timestamp))
      );
      expect(result?.integerValue).toBe('347068800');
    });

    it('epochTimestamp_returnsSeconds', () => {
      const timestamp = new Timestamp(0, 0);
      const result = evaluateToValue(
        timestampToUnixSeconds(constant(timestamp))
      );
      expect(result?.integerValue).toBe('0');
    });

    it('currentTimestamp_returnsSeconds', () => {
      const now = Timestamp.now();
      const result = evaluateToValue(timestampToUnixSeconds(constant(now)));
      expect(result?.integerValue).toBe(
        Math.floor(now.toMillis() / 1000).toString()
      );
    });

    // Skipped in Safari/WebKit due to year 10,000 boundary floating-point precision overflow
    it.skipIf(isSafariOrWebkit())('maxTimestamp_returnsSeconds', () => {
      const maxTimestamp = new Timestamp(253402300799, 999999000);
      const result = evaluateToValue(
        timestampToUnixSeconds(constant(maxTimestamp))
      );
      expect(result?.integerValue).toBe('253402300799');
    });

    it('minTimestamp_returnsSeconds', () => {
      const minTimestamp = new Timestamp(-62135596800, 0);
      const result = evaluateToValue(
        timestampToUnixSeconds(constant(minTimestamp))
      );
      expect(result?.integerValue).toBe('-62135596800');
    });

    // Skipped in Safari/WebKit due to pre-epoch negative sub-second truncation quirk
    it.skipIf(isSafariOrWebkit())('timestampTruncatesToSeconds', () => {
      const timestamp = new Timestamp(-1, 999999999);
      const result = evaluateToValue(
        timestampToUnixSeconds(constant(timestamp))
      );
      expect(result?.integerValue).toBe('-1');
    });

    it('timestampOverflow_returnsError', () => {
      expect(
        evaluateToValue(
          timestampToUnixSeconds(
            constant({
              timestampValue: {
                seconds: Number.MAX_SAFE_INTEGER,
                nanos: 999999999
              }
            })
          )
        )
      ).toBeUndefined();
    });
  });

  describe('timestampAdd() function', () => {
    it('timestampAdd_stringType_returnsError', () => {
      expect(
        evaluateToValue(
          constant('abc').timestampAdd(constant('second'), constant(1))
        )
      ).toBeUndefined();
    });

    it('timestampAdd_zeroValue_returnsTimestampEpoch', () => {
      const result = evaluateToValue(
        constant(new Timestamp(0, 0)).timestampAdd(
          constant('second'),
          constant(0)
        )
      );
      expect(result?.timestampValue).toEqual({
        seconds: 0,
        nanos: 0
      });
    });

    it('timestampAdd_intType_returnsTimestamp', () => {
      const result = evaluateToValue(
        constant(new Timestamp(0, 0)).timestampAdd(
          constant('second'),
          constant(1)
        )
      );
      expect(result?.timestampValue).toEqual({
        seconds: 1,
        nanos: 0
      });
    });

    it('timestampAdd_longType_returnsTimestamp', () => {
      const result = evaluateToValue(
        constant(new Timestamp(0, 0)).timestampAdd(
          constant('second'),
          constant(9876543210)
        )
      );
      expect(result?.timestampValue).toEqual({
        seconds: 9876543210,
        nanos: 0
      });
    });

    it('timestampAdd_longType_negative_returnsTimestamp', () => {
      const result = evaluateToValue(
        constant(new Timestamp(0, 0)).timestampAdd(
          constant('second'),
          constant(-10000)
        )
      );
      expect(result?.timestampValue).toEqual({
        seconds: -10000,
        nanos: 0
      });
    });

    it('timestampAdd_longType_negative_overflow_returnsError', () => {
      const result1 = evaluateToValue(
        constant(new Timestamp(-62135596800, 0)).timestampAdd(
          constant('second'),
          constant(0)
        )
      );
      expect(result1?.timestampValue).toEqual({
        seconds: -62135596800,
        nanos: 0
      });

      const result2 = evaluateToValue(
        constant(new Timestamp(-62135596800, 0)).timestampAdd(
          constant('second'),
          constant(-1)
        )
      );
      expect(result2).toEqual(undefined);
    });

    // Skipped in Safari/WebKit due to year 10,000 boundary floating-point precision overflow
    it.skipIf(isSafariOrWebkit())(
      'timestampAdd_longType_positive_overflow_returnsError',
      () => {
        const result1 = evaluateToValue(
          constant(new Timestamp(253402300799, 999999000)).timestampAdd(
            constant('second'),
            constant(0)
          )
        );
        expect(result1?.timestampValue).toEqual({
          seconds: 253402300799,
          nanos: 999999000
        });

        const result2 = evaluateToValue(
          constant(new Timestamp(253402300799, 999999000)).timestampAdd(
            constant('second'),
            constant(1)
          )
        );
        expect(result2).toEqual(undefined);
      }
    );

    it('timestampAdd_longType_minute_returnsTimestamp', () => {
      const result = evaluateToValue(
        constant(new Timestamp(0, 0)).timestampAdd(
          constant('minute'),
          constant(1)
        )
      );
      expect(result?.timestampValue).toEqual({
        seconds: 60,
        nanos: 0
      });
    });

    it('timestampAdd_longType_hour_returnsTimestamp', () => {
      const result = evaluateToValue(
        constant(new Timestamp(0, 0)).timestampAdd(
          constant('hour'),
          constant(1)
        )
      );
      expect(result?.timestampValue).toEqual({
        seconds: 3600,
        nanos: 0
      });
    });

    it('timestampAdd_longType_day_returnsTimestamp', () => {
      const result = evaluateToValue(
        constant(new Timestamp(0, 0)).timestampAdd(constant('day'), constant(1))
      );
      expect(result?.timestampValue).toEqual({
        seconds: 86400,
        nanos: 0
      });
    });

    it('timestampAdd_longType_millisecond_returnsTimestamp', () => {
      const result = evaluateToValue(
        constant(new Timestamp(0, 0)).timestampAdd(
          constant('millisecond'),
          constant(1)
        )
      );
      expect(result?.timestampValue).toEqual({
        seconds: 0,
        nanos: 1000000
      });
    });

    it('timestampAdd_longType_microsecond_returnsTimestamp', () => {
      const result = evaluateToValue(
        constant(new Timestamp(0, 0)).timestampAdd(
          constant('microsecond'),
          constant(1)
        )
      );
      expect(result?.timestampValue).toEqual({
        seconds: 0,
        nanos: 1000
      });
    });

    it('timestampAdd_invalidTimeUnit_returnsError', () => {
      expect(
        evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('abc'),
            constant(1)
          )
        )
      ).toBeUndefined();
    });

    it('timestampAdd_invalidAmount_returnsError', () => {
      expect(
        evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('second'),
            constant('abc')
          )
        )
      ).toBeUndefined();
    });

    it('timestampAdd_nullAmount_returnsNull', () => {
      expectEqualToConstant(
        evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant('second'),
            constant(null)
          )
        ),
        constant(null)
      );
    });

    it('timestampAdd_nullTimeUnit_returnsNull', () => {
      expectEqualToConstant(
        evaluateToValue(
          constant(new Timestamp(0, 0)).timestampAdd(
            constant(null),
            constant(1)
          )
        ),
        constant(null)
      );
    });

    it('timestampAdd_nullTimestamp_returnsNull', () => {
      expectEqualToConstant(
        evaluateToValue(
          constant(null).timestampAdd(constant('second'), constant(1))
        ),
        constant(null)
      );
    });
  });
});
