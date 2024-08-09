/**
 * @license
 * Copyright 2020 Google LLC
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

import { GeoPoint, Timestamp } from '../../../src';
import { DatabaseId } from '../../../src/core/database_info';
import { vector } from '../../../src/lite-api/field_value_impl';
import { serverTimestamp } from '../../../src/model/server_timestamps';
import {
  canonicalId,
  valueCompare,
  valueEquals,
  estimateByteSize,
  refValue,
  deepClone,
  valuesGetLowerBound,
  valuesGetUpperBound,
  TYPE_KEY,
  VECTOR_VALUE_SENTINEL,
  VECTOR_MAP_VECTORS_KEY
} from '../../../src/model/values';
import * as api from '../../../src/protos/firestore_proto_api';
import { primitiveComparator } from '../../../src/util/misc';
import {
  blob,
  dbId,
  expectCorrectComparisonGroups,
  expectEqualitySets,
  key,
  ref,
  wrap
} from '../../util/helpers';

describe('Values', () => {
  const date1 = new Date(2016, 4, 2, 1, 5);
  const date2 = new Date(2016, 5, 20, 10, 20, 30);

  it('compares values for equality', () => {
    // Each subarray compares equal to each other and false to every other value
    const values: api.Value[][] = [
      [wrap(true), wrap(true)],
      [wrap(false), wrap(false)],
      [wrap(null), wrap(null)],
      [wrap(0 / 0), wrap(Number.NaN), wrap(NaN)],
      // -0.0 and 0.0 order the same but are not considered equal.
      [wrap(-0.0)],
      [wrap(0.0)],
      [wrap(1), { integerValue: 1 }],
      // Doubles and Integers order the same but are not considered equal.
      [{ doubleValue: 1.0 }],
      [wrap(1.1), wrap(1.1)],
      [wrap(blob(0, 1, 2)), wrap(blob(0, 1, 2))],
      [wrap(blob(0, 1))],
      [wrap('string'), wrap('string')],
      [wrap('strin')],
      // latin small letter e + combining acute accent
      [wrap('e\u0301b')],
      // latin small letter e with acute accent
      [wrap('\u00e9a')],
      [wrap(date1), wrap(Timestamp.fromDate(date1))],
      [wrap(date2)],
      [
        // NOTE: ServerTimestampValues can't be parsed via wrap().
        serverTimestamp(Timestamp.fromDate(date1), null),
        serverTimestamp(Timestamp.fromDate(date1), null)
      ],
      [serverTimestamp(Timestamp.fromDate(date2), null)],
      [wrap(new GeoPoint(0, 1)), wrap(new GeoPoint(0, 1))],
      [wrap(new GeoPoint(1, 0))],
      [wrap(ref('coll/doc1')), wrap(ref('coll/doc1'))],
      [wrap(ref('coll/doc2'))],
      [wrap(['foo', 'bar']), wrap(['foo', 'bar'])],
      [wrap(['foo', 'bar', 'baz'])],
      [wrap(['foo'])],
      [wrap({ bar: 1, foo: 2 }), wrap({ foo: 2, bar: 1 })],
      [wrap({ bar: 2, foo: 1 })],
      [wrap({ bar: 1, foo: 1 })],
      [wrap({ foo: 1 })],
      [wrap(vector([]))],
      [wrap(vector([1, 2.3, -4.0]))]
    ];
    expectEqualitySets(values, (v1, v2) => valueEquals(v1, v2));
  });

  it('normalizes values for equality', () => {
    // Each subarray compares equal to each other and false to every other value
    const values: api.Value[][] = [
      [{ integerValue: '1' }, { integerValue: 1 }],
      [{ doubleValue: '1.0' }, { doubleValue: 1.0 }],
      [
        { timestampValue: '2007-04-05T14:30:01Z' },
        { timestampValue: '2007-04-05T14:30:01.000Z' },
        { timestampValue: '2007-04-05T14:30:01.000000Z' },
        {
          timestampValue: '2007-04-05T14:30:01.000000000Z'
        },
        { timestampValue: { seconds: 1175783401 } },
        { timestampValue: { seconds: '1175783401' } },
        {
          timestampValue: { seconds: 1175783401, nanos: 0 }
        }
      ],
      [
        { timestampValue: '2007-04-05T14:30:01.100Z' },
        {
          timestampValue: { seconds: 1175783401, nanos: 100000000 }
        }
      ],
      [{ bytesValue: new Uint8Array([0, 1, 2]) }, { bytesValue: 'AAEC' }]
    ];
    expectEqualitySets(values, (v1, v2) => valueEquals(v1, v2));
  });

  it('orders types correctly', () => {
    const groups = [
      // null first
      [wrap(null)],

      // booleans
      [wrap(false)],
      [wrap(true)],

      // numbers
      [wrap(NaN)],
      [wrap(-Infinity)],
      [wrap(-Number.MAX_VALUE)],
      [wrap(Number.MIN_SAFE_INTEGER - 1)],
      [wrap(Number.MIN_SAFE_INTEGER)],
      [wrap(-1.1)],
      // Integers and Doubles order the same.
      [{ integerValue: -1 }, { doubleValue: -1 }],
      [wrap(-Number.MIN_VALUE)],
      // zeros all compare the same.
      [{ integerValue: 0 }, { doubleValue: 0 }, { doubleValue: -0 }],
      [wrap(Number.MIN_VALUE)],
      [{ integerValue: 1 }, { doubleValue: 1 }],
      [wrap(1.1)],
      [wrap(Number.MAX_SAFE_INTEGER)],
      [wrap(Number.MAX_SAFE_INTEGER + 1)],
      [wrap(Infinity)],

      // timestamps
      [wrap(date1)],
      [wrap(date2)],
      [
        { timestampValue: '2020-04-05T14:30:01Z' },
        { timestampValue: '2020-04-05T14:30:01.000Z' },
        { timestampValue: '2020-04-05T14:30:01.000000Z' },
        { timestampValue: '2020-04-05T14:30:01.000000000Z' }
      ],

      // server timestamps come after all concrete timestamps.
      [serverTimestamp(Timestamp.fromDate(date1), null)],
      [serverTimestamp(Timestamp.fromDate(date2), null)],

      // strings
      [wrap('')],
      [wrap('\u0000\ud7ff\ue000\uffff')],
      [wrap('(╯°□°）╯︵ ┻━┻')],
      [wrap('a')],
      [wrap('abc def')],
      // latin small letter e + combining acute accent + latin small letter b
      [wrap('e\u0301b')],
      [wrap('æ')],
      // latin small letter e with acute accent + latin small letter a
      [wrap('\u00e9a')],

      // blobs
      [wrap(blob())],
      [wrap(blob(0))],
      [wrap(blob(0, 1, 2, 3, 4))],
      [wrap(blob(0, 1, 2, 4, 3))],
      [wrap(blob(255))],

      // reference values
      [refValue(dbId('p1', 'd1'), key('c1/doc1'))],
      [refValue(dbId('p1', 'd1'), key('c1/doc2'))],
      [refValue(dbId('p1', 'd1'), key('c10/doc1'))],
      [refValue(dbId('p1', 'd1'), key('c2/doc1'))],
      [refValue(dbId('p1', 'd2'), key('c1/doc1'))],
      [refValue(dbId('p2', 'd1'), key('c1/doc1'))],

      // geo points
      [wrap(new GeoPoint(-90, -180))],
      [wrap(new GeoPoint(-90, 0))],
      [wrap(new GeoPoint(-90, 180))],
      [wrap(new GeoPoint(0, -180))],
      [wrap(new GeoPoint(0, 0))],
      [wrap(new GeoPoint(0, 180))],
      [wrap(new GeoPoint(1, -180))],
      [wrap(new GeoPoint(1, 0))],
      [wrap(new GeoPoint(1, 180))],
      [wrap(new GeoPoint(90, -180))],
      [wrap(new GeoPoint(90, 0))],
      [wrap(new GeoPoint(90, 180))],

      // arrays
      [wrap([])],
      [wrap(['bar'])],
      [wrap(['foo'])],
      [wrap(['foo', 1])],
      [wrap(['foo', 2])],
      [wrap(['foo', '0'])],

      // vectors
      [wrap(vector([100]))],
      [wrap(vector([1, 2, 3]))],
      [wrap(vector([1, 3, 2]))],

      // objects
      [wrap({ bar: 0 })],
      [wrap({ bar: 0, foo: 1 })],
      [wrap({ foo: 1 })],
      [wrap({ foo: 2 })],
      [wrap({ foo: '0' })]
    ];

    expectCorrectComparisonGroups(
      groups,
      (left: api.Value, right: api.Value) => {
        return valueCompare(left, right);
      }
    );
  });

  it('normalizes values for comparison', () => {
    const groups = [
      [{ integerValue: '1' }, { integerValue: 1 }],
      [{ doubleValue: '2' }, { doubleValue: 2 }],
      [
        { timestampValue: '2007-04-05T14:30:01Z' },
        { timestampValue: { seconds: 1175783401 } }
      ],
      [
        { timestampValue: '2007-04-05T14:30:01.999Z' },
        {
          timestampValue: { seconds: 1175783401, nanos: 999000000 }
        }
      ],
      [
        { timestampValue: '2007-04-05T14:30:02Z' },
        { timestampValue: { seconds: 1175783402 } }
      ],
      [
        { timestampValue: '2007-04-05T14:30:02.100Z' },
        {
          timestampValue: { seconds: 1175783402, nanos: 100000000 }
        }
      ],
      [
        { timestampValue: '2007-04-05T14:30:02.100001Z' },
        {
          timestampValue: { seconds: 1175783402, nanos: 100001000 }
        }
      ],
      [{ bytesValue: new Uint8Array([0, 1, 2]) }, { bytesValue: 'AAEC' }],
      [{ bytesValue: new Uint8Array([0, 1, 3]) }, { bytesValue: 'AAED' }]
    ];

    expectCorrectComparisonGroups(
      groups,
      (left: api.Value, right: api.Value) => {
        return valueCompare(left, right);
      }
    );
  });

  it('estimates size correctly for fixed sized values', () => {
    // This test verifies that each member of a group takes up the same amount
    // of space in memory (based on its estimated in-memory size).
    const equalityGroups = [
      { expectedByteSize: 4, elements: [wrap(null), wrap(false), wrap(true)] },
      {
        expectedByteSize: 4,
        elements: [wrap(blob(0, 1)), wrap(blob(128, 129))]
      },
      {
        expectedByteSize: 8,
        elements: [wrap(NaN), wrap(Infinity), wrap(1), wrap(1.1)]
      },
      {
        expectedByteSize: 16,
        elements: [wrap(new GeoPoint(0, 0)), wrap(new GeoPoint(0, 0))]
      },
      {
        expectedByteSize: 16,
        elements: [wrap(Timestamp.fromMillis(100)), wrap(Timestamp.now())]
      },
      {
        expectedByteSize: 16,
        elements: [
          serverTimestamp(Timestamp.fromMillis(100), null),
          serverTimestamp(Timestamp.now(), null)
        ]
      },
      {
        expectedByteSize: 20,
        elements: [
          serverTimestamp(Timestamp.fromMillis(100), wrap(true)),
          serverTimestamp(Timestamp.now(), wrap(false))
        ]
      },
      {
        expectedByteSize: 42,
        elements: [
          refValue(dbId('p1', 'd1'), key('c1/doc1')),
          refValue(dbId('p2', 'd2'), key('c2/doc2'))
        ]
      },
      { expectedByteSize: 6, elements: [wrap('foo'), wrap('bar')] },
      { expectedByteSize: 4, elements: [wrap(['a', 'b']), wrap(['c', 'd'])] },
      {
        expectedByteSize: 6,
        elements: [wrap({ a: 'a', b: 'b' }), wrap({ c: 'c', d: 'd' })]
      },
      {
        expectedByteSize: 49,
        elements: [wrap(vector([1, 2])), wrap(vector([-100, 20000098.123445]))]
      }
    ];

    for (const group of equalityGroups) {
      for (const element of group.elements) {
        expect(estimateByteSize(element)).to.equal(group.expectedByteSize);
      }
    }
  });

  it('estimates size correctly for relatively sized values', () => {
    // This test verifies for each group that the estimated size increases
    // as the size of the underlying data grows.
    const relativeGroups: api.Value[][] = [
      [wrap(blob(0)), wrap(blob(0, 1))],
      [
        serverTimestamp(Timestamp.fromMillis(100), null),
        serverTimestamp(Timestamp.now(), wrap(null))
      ],
      [
        refValue(dbId('p1', 'd1'), key('c1/doc1')),
        refValue(dbId('p1', 'd1'), key('c1/doc1/c2/doc2'))
      ],
      [wrap('foo'), wrap('foobar')],
      [wrap(['a', 'b']), wrap(['a', 'bc'])],
      [wrap(['a', 'b']), wrap(['a', 'b', 'c'])],
      [wrap({ a: 'a', b: 'b' }), wrap({ a: 'a', b: 'bc' })],
      [wrap({ a: 'a', b: 'b' }), wrap({ a: 'a', bc: 'b' })],
      [wrap({ a: 'a', b: 'b' }), wrap({ a: 'a', b: 'b', c: 'c' })],
      [wrap({ a: 'a', b: 'b' }), wrap({ a: 'a', b: 'b', c: 'c' })],
      [wrap(vector([2, 3])), wrap(vector([1, 2, 3]))]
    ];

    for (const group of relativeGroups) {
      const expectedOrder = group;
      const actualOrder = group
        .slice()
        .sort((l, r) =>
          primitiveComparator(estimateByteSize(l), estimateByteSize(r))
        );
      expect(expectedOrder).to.deep.equal(actualOrder);
    }
  });

  it('computes lower bound', () => {
    const groups = [
      // null first
      [valuesGetLowerBound({ nullValue: 'NULL_VALUE' }), wrap(null)],

      // booleans
      [valuesGetLowerBound({ booleanValue: true }), wrap(false)],
      [wrap(true)],

      // numbers
      [valuesGetLowerBound({ doubleValue: 0 }), wrap(NaN)],
      [wrap(Number.NEGATIVE_INFINITY)],
      [wrap(Number.MIN_VALUE)],

      // dates
      [valuesGetLowerBound({ timestampValue: {} })],
      [wrap(date1)],

      // strings
      [valuesGetLowerBound({ stringValue: '' }), wrap('')],
      [wrap('\u0000')],

      // resource names
      [
        valuesGetLowerBound({ referenceValue: '' }),
        refValue(DatabaseId.empty(), key(''))
      ],
      [refValue(DatabaseId.empty(), key('a/a'))],

      // geo points
      [
        valuesGetLowerBound({ geoPointValue: {} }),
        wrap(new GeoPoint(-90, -180))
      ],
      [wrap(new GeoPoint(-90, 0))],

      // arrays
      [valuesGetLowerBound({ arrayValue: {} }), wrap([])],
      [wrap([false])],

      // vectors
      [
        valuesGetLowerBound({
          mapValue: {
            fields: {
              [TYPE_KEY]: { stringValue: VECTOR_VALUE_SENTINEL },
              [VECTOR_MAP_VECTORS_KEY]: {
                arrayValue: {
                  values: [{ doubleValue: 1 }]
                }
              }
            }
          }
        }),
        wrap(vector([]))
      ],

      // objects
      [valuesGetLowerBound({ mapValue: {} }), wrap({})]
    ];

    expectCorrectComparisonGroups(
      groups,
      (left: api.Value, right: api.Value) => {
        return valueCompare(left, right);
      }
    );
  });

  it('computes upper bound', () => {
    const groups = [
      // null first
      [wrap(null)],
      [valuesGetUpperBound({ nullValue: 'NULL_VALUE' })],

      // booleans
      [wrap(true)],
      [valuesGetUpperBound({ booleanValue: false })],

      // numbers
      [wrap(Number.MAX_SAFE_INTEGER)],
      [wrap(Number.POSITIVE_INFINITY)],
      [valuesGetUpperBound({ doubleValue: NaN })],

      // dates
      [wrap(date1)],
      [valuesGetUpperBound({ timestampValue: {} })],

      // strings
      [wrap('\u0000')],
      [valuesGetUpperBound({ stringValue: '' })],

      // blobs
      [wrap(blob(255))],
      [valuesGetUpperBound({ bytesValue: '' })],

      // resource names
      [refValue(dbId('', ''), key('a/a'))],
      [valuesGetUpperBound({ referenceValue: '' })],

      // geo points
      [wrap(new GeoPoint(90, 180))],
      [valuesGetUpperBound({ geoPointValue: {} })],

      // arrays
      [wrap([false])],
      [valuesGetUpperBound({ arrayValue: {} })],

      // objects
      [wrap({ 'a': 'b' })]
    ];

    expectCorrectComparisonGroups(
      groups,
      (left: api.Value, right: api.Value) => {
        return valueCompare(left, right);
      }
    );
  });

  it('canonicalizes values', () => {
    expect(canonicalId(wrap(null))).to.equal('null');
    expect(canonicalId(wrap(true))).to.equal('true');
    expect(canonicalId(wrap(false))).to.equal('false');
    expect(canonicalId(wrap(1))).to.equal('1');
    expect(canonicalId(wrap(1.1))).to.equal('1.1');
    expect(canonicalId(wrap(new Timestamp(30, 1000)))).to.equal(
      'time(30,1000)'
    );
    expect(canonicalId(wrap('a'))).to.equal('a');
    expect(canonicalId(wrap(blob(1, 2, 3)))).to.equal('AQID');
    expect(canonicalId(refValue(dbId('p1', 'd1'), key('c1/doc1')))).to.equal(
      'c1/doc1'
    );
    expect(canonicalId(wrap(new GeoPoint(30, 60)))).to.equal('geo(30,60)');
    expect(canonicalId(wrap([1, 2, 3]))).to.equal('[1,2,3]');
    expect(
      canonicalId(
        wrap({
          'a': 1,
          'b': 2,
          'c': '3'
        })
      )
    ).to.equal('{a:1,b:2,c:3}');
    expect(canonicalId(wrap(vector([1, 1.0, -2, 3.14])))).to.equal(
      '{__type__:__vector__,value:[1,1,-2,3.14]}'
    );
    expect(
      canonicalId(wrap({ 'a': ['b', { 'c': new GeoPoint(30, 60) }] }))
    ).to.equal('{a:[b,{c:geo(30,60)}]}');
  });

  it('canonical IDs ignore sort order', () => {
    expect(
      canonicalId(
        wrap({
          'a': 1,
          'b': 2,
          'c': '3'
        })
      )
    ).to.equal('{a:1,b:2,c:3}');
    expect(
      canonicalId(
        wrap({
          'c': 3,
          'b': 2,
          'a': '1'
        })
      )
    ).to.equal('{a:1,b:2,c:3}');
  });

  it('clones properties without normalization', () => {
    const values = [
      { integerValue: '1' },
      { integerValue: 1 },
      { doubleValue: '2' },
      { doubleValue: 2 },
      { timestampValue: '2007-04-05T14:30:01Z' },
      { timestampValue: { seconds: 1175783401 } },
      { timestampValue: '2007-04-05T14:30:01.999Z' },
      {
        timestampValue: { seconds: 1175783401, nanos: 999000000 }
      },
      { timestampValue: '2007-04-05T14:30:02Z' },
      { timestampValue: { seconds: 1175783402 } },
      { timestampValue: '2007-04-05T14:30:02.100Z' },
      {
        timestampValue: { seconds: 1175783402, nanos: 100000000 }
      },
      { timestampValue: '2007-04-05T14:30:02.100001Z' },
      {
        timestampValue: { seconds: 1175783402, nanos: 100001000 }
      },
      { bytesValue: new Uint8Array([0, 1, 2]) },
      { bytesValue: 'AAEC' },
      { bytesValue: new Uint8Array([0, 1, 3]) },
      { bytesValue: 'AAED' }
    ];

    for (const value of values) {
      expect(deepClone(value)).to.deep.equal(value);
      const mapValue = { mapValue: { fields: { foo: value } } };
      expect(deepClone(mapValue)).to.deep.equal(mapValue);
      const arrayValue = { arrayValue: { values: [value] } };
      expect(deepClone(arrayValue)).to.deep.equal(arrayValue);
    }
  });
});
