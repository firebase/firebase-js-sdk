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

import { Bound } from '../../../src/core/bound';
import {
  queryToTarget,
  queryWithEndAt,
  queryWithStartAt
} from '../../../src/core/query';
import {
  targetGetUpperBound,
  targetGetLowerBound,
  targetGetArrayValues
} from '../../../src/core/target';
import { IndexKind } from '../../../src/model/field_index';
import {
  canonicalId,
  MAX_VALUE,
  MIN_VALUE,
  valueEquals
} from '../../../src/model/values';
import {
  blob,
  bound,
  fieldIndex,
  filter,
  orderBy,
  query,
  wrap
} from '../../util/helpers';

describe('Target Bounds', () => {
  // TODO(indexing): Consider adding more test helpers to reduce the boilerplate
  // in these tests.

  it('empty query', () => {
    const target = queryToTarget(query('c'));
    const index = fieldIndex('c');

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true);

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true);
  });

  it('equals query with ascending index', () => {
    const target = queryToTarget(query('c', filter('foo', '==', 'bar')));
    const index = fieldIndex('c', { fields: [['foo', IndexKind.ASCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, 'bar');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true, 'bar');
  });

  it('equals query with descending index', () => {
    const target = queryToTarget(query('c', filter('foo', '==', 'bar')));
    const index = fieldIndex('c', { fields: [['foo', IndexKind.DESCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, 'bar');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true, 'bar');
  });

  it('less than query with ascending index', () => {
    const target = queryToTarget(query('c', filter('foo', '<', 'bar')));
    const index = fieldIndex('c', { fields: [['foo', IndexKind.ASCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, '');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, false, 'bar');
  });

  it('less than query with descending index', () => {
    const target = queryToTarget(query('c', filter('foo', '<', 'bar')));
    const index = fieldIndex('c', { fields: [['foo', IndexKind.DESCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, false, 'bar');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true, '');
  });

  it('less than or equals query with ascending index', () => {
    const target = queryToTarget(query('c', filter('foo', '<=', 'bar')));
    const index = fieldIndex('c', { fields: [['foo', IndexKind.ASCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, '');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true, 'bar');
  });

  it('less than or equals query with descending index', () => {
    const target = queryToTarget(query('c', filter('foo', '<=', 'bar')));
    const index = fieldIndex('c', { fields: [['foo', IndexKind.DESCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, 'bar');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true, '');
  });

  it('greater than query with ascending index', () => {
    const target = queryToTarget(query('c', filter('foo', '>', 'bar')));
    const index = fieldIndex('c', { fields: [['foo', IndexKind.ASCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, false, 'bar');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, false, blob());
  });

  it('greater than query with descending index', () => {
    const target = queryToTarget(query('c', filter('foo', '>', 'bar')));
    const index = fieldIndex('c', { fields: [['foo', IndexKind.DESCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, false, blob());

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, false, 'bar');
  });

  it('greater than or equals query with ascending index', () => {
    const target = queryToTarget(query('c', filter('foo', '>=', 'bar')));
    const index = fieldIndex('c', { fields: [['foo', IndexKind.ASCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, 'bar');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, false, blob());
  });

  it('greater than or equals query with descending index', () => {
    const target = queryToTarget(query('c', filter('foo', '>=', 'bar')));
    const index = fieldIndex('c', { fields: [['foo', IndexKind.DESCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, false, blob());

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true, 'bar');
  });

  it('arrayContains query', () => {
    const target = queryToTarget(
      query('c', filter('foo', 'array-contains', 'bar'))
    );
    const index = fieldIndex('c', { fields: [['foo', IndexKind.CONTAINS]] });

    const arrayValues = targetGetArrayValues(target, index);
    expect(arrayValues).to.deep.equal([wrap('bar')]);

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true);

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true);
  });

  it('arrayContainsAny query', () => {
    const target = queryToTarget(
      query('c', filter('foo', 'array-contains-any', ['bar', 'baz']))
    );
    const index = fieldIndex('c', { fields: [['foo', IndexKind.CONTAINS]] });

    const arrayValues = targetGetArrayValues(target, index);
    expect(arrayValues).to.deep.equal(wrap(['bar', 'baz']).arrayValue!.values);

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true);

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true);
  });

  it('orderBy query', () => {
    const target = queryToTarget(query('c', orderBy('foo')));
    const index = fieldIndex('c', { fields: [['foo', IndexKind.ASCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    expect(lowerBound?.position[0]).to.equal(MIN_VALUE);
    expect(lowerBound?.inclusive).to.be.true;

    const upperBound = targetGetUpperBound(target, index);
    expect(upperBound?.position[0]).to.equal(MAX_VALUE);
    expect(upperBound?.inclusive).to.be.true;
  });

  it('orderBy query with filter', () => {
    const target = queryToTarget(
      query('c', filter('foo', '>', 'bar'), orderBy('foo'))
    );
    const index = fieldIndex('c', { fields: [['foo', IndexKind.ASCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, false, 'bar');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, false, blob());
  });

  it('startAt query', () => {
    const target = queryToTarget(
      queryWithStartAt(
        query('c', orderBy('foo')),
        bound(['bar'], /* inclusive= */ true)
      )
    );
    const index = fieldIndex('c', { fields: [['foo', IndexKind.ASCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, 'bar');

    const upperBound = targetGetUpperBound(target, index);
    expect(upperBound?.position[0]).to.equal(MAX_VALUE);
    expect(upperBound?.inclusive).to.be.true;
  });

  it('startAt query with filter', () => {
    // Tests that the startAt and the filter get merged to form a narrow bound
    const target = queryToTarget(
      queryWithStartAt(
        query(
          'c',
          filter('a', '>=', 'a1'),
          filter('b', '==', 'b1'),
          orderBy('a'),
          orderBy('b')
        ),
        bound(['a1', 'b1'], /* inclusive= */ true)
      )
    );
    const index = fieldIndex('c', {
      fields: [
        ['a', IndexKind.ASCENDING],
        ['b', IndexKind.ASCENDING]
      ]
    });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, 'a1', 'b1');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, false, blob(), 'b1');
  });

  it('startAfter query with filter', () => {
    const target = queryToTarget(
      queryWithStartAt(
        query(
          'c',
          filter('a', '>=', 'a1'),
          filter('b', '==', 'b1'),
          orderBy('a'),
          orderBy('b')
        ),
        bound(['a2', 'b1'], /* inclusive= */ false)
      )
    );
    const index = fieldIndex('c', {
      fields: [
        ['a', IndexKind.ASCENDING],
        ['b', IndexKind.ASCENDING]
      ]
    });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, false, 'a2', 'b1');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, false, blob(), 'b1');
  });

  it('startAfter does not change bound if not applicable', () => {
    const target = queryToTarget(
      queryWithStartAt(
        query(
          'c',
          filter('a', '>=', 'a2'),
          filter('b', '==', 'b2'),
          orderBy('a'),
          orderBy('b')
        ),
        bound(['a1', 'b1'], /* inclusive= */ false)
      )
    );
    const index = fieldIndex('c', {
      fields: [
        ['a', IndexKind.ASCENDING],
        ['b', IndexKind.ASCENDING]
      ]
    });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, 'a2', 'b2');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, false, blob(), 'b2');
  });

  it('endAt query', () => {
    const target = queryToTarget(
      queryWithEndAt(
        query('c', orderBy('foo')),
        bound(['bar'], /* inclusive= */ true)
      )
    );
    const index = fieldIndex('c', { fields: [['foo', IndexKind.ASCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    expect(lowerBound?.position[0]).to.equal(MIN_VALUE);
    expect(lowerBound?.inclusive).to.be.true;

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true, 'bar');
  });

  it('endAt query with filter', () => {
    // Tests that the endAt and the filter get merged to form a narrow bound
    const target = queryToTarget(
      queryWithEndAt(
        query(
          'c',
          filter('a', '<=', 'a2'),
          filter('b', '==', 'b2'),
          orderBy('a'),
          orderBy('b')
        ),
        bound(['a1', 'b1'], /* inclusive= */ true)
      )
    );
    const index = fieldIndex('c', {
      fields: [
        ['a', IndexKind.ASCENDING],
        ['b', IndexKind.ASCENDING]
      ]
    });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, '', 'b2');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true, 'a1', 'b1');
  });

  it('endBefore query with filter', () => {
    const target = queryToTarget(
      queryWithEndAt(
        query(
          'c',
          filter('a', '<=', 'a2'),
          filter('b', '==', 'b2'),
          orderBy('a'),
          orderBy('b')
        ),
        bound(['a1', 'b1'], /* inclusive= */ false)
      )
    );
    const index = fieldIndex('c', {
      fields: [
        ['a', IndexKind.ASCENDING],
        ['b', IndexKind.ASCENDING]
      ]
    });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, '', 'b2');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, false, 'a1', 'b1');
  });

  it('endBefore does not change bound if not applicable', () => {
    const target = queryToTarget(
      queryWithEndAt(
        query(
          'c',
          filter('a', '<=', 'a1'),
          filter('b', '==', 'b1'),
          orderBy('a'),
          orderBy('b')
        ),
        bound(['a2', 'b2'], /* inclusive= */ false)
      )
    );
    const index = fieldIndex('c', {
      fields: [
        ['a', IndexKind.ASCENDING],
        ['b', IndexKind.ASCENDING]
      ]
    });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, '', 'b1');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true, 'a1', 'b1');
  });

  it('partial index match with bound', () => {
    const target = queryToTarget(
      query('c', filter('a', '==', 'a'), filter('b', '==', 'b'))
    );
    const index = fieldIndex('c', { fields: [['a', IndexKind.ASCENDING]] });

    const lowerBound = targetGetLowerBound(target, index);
    verifyBound(lowerBound, true, 'a');

    const upperBound = targetGetUpperBound(target, index);
    verifyBound(upperBound, true, 'a');
  });

  function verifyBound(
    bound: Bound | null,
    inclusive: boolean,
    ...values: unknown[]
  ): void {
    expect(bound).to.not.be.null;
    expect(bound!.inclusive).to.equal(inclusive, 'inclusive');
    const position = bound!.position;
    expect(position.length).to.equal(values.length, 'size');
    for (let i = 0; i < values.length; ++i) {
      const expectedValue = wrap(values[i]);
      expect(
        valueEquals(position[i], expectedValue),
        `Values should be equal: Expected: ${canonicalId(
          expectedValue
        )}, Actual: ${canonicalId(position[i])}`
      );
    }
  }
});
