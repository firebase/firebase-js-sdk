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

import * as api from '../../../src/protos/firestore_proto_api';

import { expect } from 'chai';

import { Timestamp } from '../../../src/api/timestamp';
import { GeoPoint } from '../../../src/api/geo_point';
import { DatabaseId } from '../../../src/core/database_info';
import {
  canonicalId,
  compare,
  equals,
  estimateByteSize
} from '../../../src/model/values';
import { DocumentKey } from '../../../src/model/document_key';
import { PrimitiveValue } from '../../../src/model/proto_field_value';
import { primitiveComparator } from '../../../src/util/misc';
import * as typeUtils from '../../../src/util/types';
import {
  blob,
  dbId,
  expectCorrectComparisonGroups,
  expectEqualitySets,
  key,
  ref
} from '../../util/helpers';
import { valueOf } from '../../util/values';

describe('Values', () => {
  const date1 = new Date(2016, 4, 2, 1, 5);
  const date2 = new Date(2016, 5, 20, 10, 20, 30);

  it('compares values for equality', () => {
    // Each subarray compares equal to each other and false to every other value
    const values: FieldValue[][] = [
      [wrap(true), new PrimitiveValue(valueOf(true))],
      [wrap(false), new PrimitiveValue(valueOf(false))],
      [wrap(null), new PrimitiveValue(valueOf(null))],
      [wrap(0 / 0), wrap(Number.NaN), new PrimitiveValue(valueOf(NaN))],
      // -0.0 and 0.0 order the same but are not considered equal.
      [wrap(-0.0)],
      [wrap(0.0)],
      [wrap(1), new PrimitiveValue({integerValue: 1})],
      // Doubles and Integers order the same but are not considered equal.
      [new PrimitiveValue({doubleValue: 1.0})],
      [wrap(1.1), new PrimitiveValue(valueOf(1.1))],
      [wrap(blob(0, 1, 2)), new PrimitiveValue(valueOf(blob(0, 1, 2)))],
      [wrap(blob(0, 1))],
      [wrap('string'), new PrimitiveValue(valueOf('string'))],
      [wrap('strin')],
      // latin small letter e + combining acute accent
      [wrap('e\u0301b')],
      // latin small letter e with acute accent
      [wrap('\u00e9a')],
      [wrap(date1), new PrimitiveValue(valueOf(Timestamp.fromDate(date1)))],
      [wrap(date2)],
      [
        // NOTE: ServerTimestampValues can't be parsed via wrap().
        new ServerTimestampValue(Timestamp.fromDate(date1), null),
        new ServerTimestampValue(Timestamp.fromDate(date1), null)
      ],
      [new ServerTimestampValue(Timestamp.fromDate(date2), null)],
      [
        wrap(new GeoPoint(0, 1)),
        new PrimitiveValue(valueOf(new GeoPoint(0, 1)))
      ],
      [wrap(new GeoPoint(1, 0))],
      [
        wrap(ref('project', 'coll/doc1')),
        new PrimitiveValue(valueOf(ref('project', 'coll/doc1')))
      ],
      [wrap(ref('project', 'coll/doc2'))],
      [wrap(['foo', 'bar']), wrap(['foo', 'bar'])],
      [wrap(['foo', 'bar', 'baz'])],
      [wrap(['foo'])],
      [wrap({bar: 1, foo: 2}), wrap({foo: 2, bar: 1})],
      [wrap({bar: 2, foo: 1})],
      [wrap({bar: 1, foo: 1})],
      [wrap({foo: 1})]
    ];
    expectEqualitySets(values, (v1, v2) => v1.isEqual(v2));
  });

  it('normalizes values for equality', () => {
    // Each subarray compares equal to each other and false to every other value
    const values: FieldValue[][] = [
      [
        new PrimitiveValue({integerValue: '1'}),
        new PrimitiveValue({integerValue: 1})
      ],
      [
        new PrimitiveValue({doubleValue: '1.0'}),
        new PrimitiveValue({doubleValue: 1.0})
      ],
      [
        new PrimitiveValue({timestampValue: '2007-04-05T14:30:01Z'}),
        new PrimitiveValue({timestampValue: '2007-04-05T14:30:01.000Z'}),
        new PrimitiveValue({timestampValue: '2007-04-05T14:30:01.000000Z'}),
        new PrimitiveValue({
          timestampValue: '2007-04-05T14:30:01.000000000Z'
        }),
        new PrimitiveValue({timestampValue: {seconds: 1175783401}}),
        new PrimitiveValue({timestampValue: {seconds: '1175783401'}}),
        new PrimitiveValue({
          timestampValue: {seconds: 1175783401, nanos: 0}
        })
      ],
      [
        new PrimitiveValue({timestampValue: '2007-04-05T14:30:01.100Z'}),
        new PrimitiveValue({
          timestampValue: {seconds: 1175783401, nanos: 100000000}
        })
      ],
      [
        new PrimitiveValue({bytesValue: new Uint8Array([0, 1, 2])}),
        new PrimitiveValue({bytesValue: 'AAEC'})
      ]
    ];
    expectEqualitySets(values, (v1, v2) => v1.isEqual(v2));
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
      [wrap(typeUtils.MIN_SAFE_INTEGER - 1)],
      [wrap(typeUtils.MIN_SAFE_INTEGER)],
      [wrap(-1.1)],
      // Integers and Doubles order the same.
      [
        new PrimitiveValue({integerValue: -1}),
        new PrimitiveValue({doubleValue: -1})
      ],
      [wrap(-Number.MIN_VALUE)],
      // zeros all compare the same.
      [
        new PrimitiveValue({integerValue: 0}),
        new PrimitiveValue({doubleValue: 0}),
        new PrimitiveValue({doubleValue: -0})
      ],
      [wrap(Number.MIN_VALUE)],
      [
        new PrimitiveValue({integerValue: 1}),
        new PrimitiveValue({doubleValue: 1})
      ],
      [wrap(1.1)],
      [wrap(typeUtils.MAX_SAFE_INTEGER)],
      [wrap(typeUtils.MAX_SAFE_INTEGER + 1)],
      [wrap(Infinity)],

      // timestamps
      [wrap(date1)],
      [wrap(date2)],

      // server timestamps come after all concrete timestamps.
      [new ServerTimestampValue(Timestamp.fromDate(date1), null)],
      [new ServerTimestampValue(Timestamp.fromDate(date2), null)],

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
      [wrapRef(dbId('p1', 'd1'), key('c1/doc1'))],
      [wrapRef(dbId('p1', 'd1'), key('c1/doc2'))],
      [wrapRef(dbId('p1', 'd1'), key('c10/doc1'))],
      [wrapRef(dbId('p1', 'd1'), key('c2/doc1'))],
      [wrapRef(dbId('p1', 'd2'), key('c1/doc1'))],
      [wrapRef(dbId('p2', 'd1'), key('c1/doc1'))],

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

      // objects
      [wrap({bar: 0})],
      [wrap({bar: 0, foo: 1})],
      [wrap({foo: 1})],
      [wrap({foo: 2})],
      [wrap({foo: '0'})]
    ];

    expectCorrectComparisonGroups(
      groups,
      (left: FieldValue, right: FieldValue) => {
        return left.compareTo(right);
      }
    );
  });

  it('normalizes values for comparison', () => {
    const groups = [
      [
        new PrimitiveValue({integerValue: '1'}),
        new PrimitiveValue({integerValue: 1})
      ],
      [
        new PrimitiveValue({doubleValue: '2'}),
        new PrimitiveValue({doubleValue: 2})
      ],
      [
        new PrimitiveValue({timestampValue: '2007-04-05T14:30:01Z'}),
        new PrimitiveValue({timestampValue: {seconds: 1175783401}})
      ],
      [
        new PrimitiveValue({timestampValue: '2007-04-05T14:30:01.999Z'}),
        new PrimitiveValue({
          timestampValue: {seconds: 1175783401, nanos: 999000000}
        })
      ],
      [
        new PrimitiveValue({timestampValue: '2007-04-05T14:30:02Z'}),
        new PrimitiveValue({timestampValue: {seconds: 1175783402}})
      ],
      [
        new PrimitiveValue({timestampValue: '2007-04-05T14:30:02.100Z'}),
        new PrimitiveValue({
          timestampValue: {seconds: 1175783402, nanos: 100000000}
        })
      ],
      [
        new PrimitiveValue({timestampValue: '2007-04-05T14:30:02.100001Z'}),
        new PrimitiveValue({
          timestampValue: {seconds: 1175783402, nanos: 100001000}
        })
      ],
      [
        new PrimitiveValue({bytesValue: new Uint8Array([0, 1, 2])}),
        new PrimitiveValue({bytesValue: 'AAEC'})
      ],
      [
        new PrimitiveValue({bytesValue: new Uint8Array([0, 1, 3])}),
        new PrimitiveValue({bytesValue: 'AAED'})
      ]
    ];

    expectCorrectComparisonGroups(
      groups,
      (left: FieldValue, right: FieldValue) => {
        return left.compareTo(right);
      }
    );
  });

  it('estimates size correctly for fixed sized values', () => {
    // This test verifies that each member of a group takes up the same amount
    // of space in memory (based on its estimated in-memory size).
    const equalityGroups = [
      {expectedByteSize: 4, elements: [wrap(null), wrap(false), wrap(true)]},
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
      // TODO(mrschmidt): Support server timestamps
      // {
      //   expectedByteSize: 16,
      //   elements: [
      //     new ServerTimestampValue(Timestamp.fromMillis(100), null),
      //     new ServerTimestampValue(Timestamp.now(), null)
      //   ]
      // },
      // {
      //   expectedByteSize: 20,
      //   elements: [
      //     new ServerTimestampValue(Timestamp.fromMillis(100), wrap(true)),
      //     new ServerTimestampValue(Timestamp.now(), wrap(false))
      //   ]
      // },
      {
        expectedByteSize: 42,
        elements: [
          wrapRef(dbId('p1', 'd1'), key('c1/doc1')),
          wrapRef(dbId('p2', 'd2'), key('c2/doc2'))
        ]
      },
      {expectedByteSize: 6, elements: [wrap('foo'), wrap('bar')]},
      {expectedByteSize: 4, elements: [wrap(['a', 'b']), wrap(['c', 'd'])]},
      {
        expectedByteSize: 6,
        elements: [wrap({a: 'a', b: 'b'}), wrap({c: 'c', d: 'd'})]
      }
    ];

    for (const group of equalityGroups) {
      for (const element of group.elements) {
        expect(estimateByteSize(element.proto)).to.equal(
          group.expectedByteSize
        );
      }
    }
  });

  it('estimates size correctly for relatively sized values', () => {
    // This test verifies for each group that the estimated size increases
    // as the size of the underlying data grows.
    const relativeGroups: FieldValue[][] = [
      [wrap(blob(0)), wrap(blob(0, 1))],
      [
        new ServerTimestampValue(Timestamp.fromMillis(100), null),
        new ServerTimestampValue(Timestamp.now(), wrap(null))
      ],
      [
        wrapRef(dbId('p1', 'd1'), key('c1/doc1')),
        wrapRef(dbId('p1', 'd1'), key('c1/doc1/c2/doc2'))
      ],
      [wrap('foo'), wrap('foobar')],
      [wrap(['a', 'b']), wrap(['a', 'bc'])],
      [wrap(['a', 'b']), wrap(['a', 'b', 'c'])],
      [wrap({a: 'a', b: 'b'}), wrap({a: 'a', b: 'bc'})],
      [wrap({a: 'a', b: 'b'}), wrap({a: 'a', bc: 'b'})],
      [wrap({a: 'a', b: 'b'}), wrap({a: 'a', b: 'b', c: 'c'})]
    ];

    for (const group of relativeGroups) {
      const expectedOrder = group;
      const actualOrder = group
        .slice()
        .sort((l, r) =>
          primitiveComparator(l.approximateByteSize(), r.approximateByteSize())
        );
      expect(expectedOrder).to.deep.equal(actualOrder);
    }
  });

  it('canonicalizes values', () => {
    expect(canonicalId(wrap(null).proto)).to.equal('null');
    expect(canonicalId(wrap(true).proto)).to.equal('true');
    expect(canonicalId(wrap(false).proto)).to.equal('false');
    expect(canonicalId(wrap(1).proto)).to.equal('1');
    expect(canonicalId(wrap(1.1).proto)).to.equal('1.1');
    expect(canonicalId(wrap(new Timestamp(30, 60)).proto)).to.equal(
      'time(30,60)'
    );
    expect(canonicalId(wrap('a').proto)).to.equal('a');
    expect(canonicalId(wrap(blob(1, 2, 3)).proto)).to.equal('AQID');
    expect(
      canonicalId(wrapRef(dbId('p1', 'd1'), key('c1/doc1')).proto)
    ).to.equal('projects/p1/databases/d1/documents/c1/doc1');
    expect(canonicalId(wrap(new GeoPoint(30, 60)).proto)).to.equal(
      'geo(30,60)'
    );
    expect(canonicalId(wrap([1, 2, 3]).proto)).to.equal('[1,2,3]');
    expect(
      canonicalId(
        wrap({
          'a': 1,
          'b': 2,
          'c': '3'
        }).proto
      )
    ).to.equal('{a:1,b:2,c:3}');
    expect(
      canonicalId(wrap({'a': ['b', {'c': new GeoPoint(30, 60)}]}).proto)
    ).to.equal('{a:[b,{c:geo(30,60)}]}');
  });

  it('canonical IDs ignore sort order', () => {
    expect(
      canonicalId(
        wrap({
          'a': 1,
          'b': 2,
          'c': '3'
        }).proto
      )
    ).to.equal('{a:1,b:2,c:3}');
    expect(
      canonicalId(
        wrap({
          'c': 3,
          'b': 2,
          'a': '1'
        }).proto
      )
    ).to.equal('{a:1,b:2,c:3}');
  });

// TODO(mrschmidt): Clean up the helpers and merge wrap() with TestUtil.wrap()
  function wrap(value: unknown): PrimitiveValue {
    return new PrimitiveValue(valueOf(value));
  }

  function wrapRef(
    databaseId: DatabaseId,
    documentKey: DocumentKey
  ): PrimitiveValue {
    return new PrimitiveValue(refValue(databaseId, documentKey));
  }
}
