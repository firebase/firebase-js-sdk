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

import {
  queryToTarget,
  queryWithAddedFilter,
  queryWithAddedOrderBy,
  Query,
  newQueryForCollectionGroup
} from '../../../src/core/query';
import { targetGetSegmentCount } from '../../../src/core/target';
import { FieldIndex, IndexKind } from '../../../src/model/field_index';
import { TargetIndexMatcher } from '../../../src/model/target_index_matcher';
import { fieldIndex, filter, orderBy, query } from '../../util/helpers';

describe('Target Bounds', () => {
  const queriesWithEqualities = [
    queryWithAddedFilter(query('collId'), filter('a', '==', 'a')),
    queryWithAddedFilter(query('collId'), filter('a', 'in', ['a']))
  ];

  const queriesWithInequalities = [
    queryWithAddedFilter(query('collId'), filter('a', '<', 'a')),
    queryWithAddedFilter(query('collId'), filter('a', '<=', 'a')),
    queryWithAddedFilter(query('collId'), filter('a', '>=', 'a')),
    queryWithAddedFilter(query('collId'), filter('a', '>', 'a')),
    queryWithAddedFilter(query('collId'), filter('a', '!=', 'a')),
    queryWithAddedFilter(query('collId'), filter('a', 'not-in', ['a']))
  ];

  const queriesWithArrayContains = [
    queryWithAddedFilter(query('collId'), filter('a', 'array-contains', 'a')),
    queryWithAddedFilter(
      query('collId'),
      filter('a', 'array-contains-any', ['a'])
    )
  ];

  const queriesWithOrderBy = [
    queryWithAddedOrderBy(query('collId'), orderBy('a')),
    queryWithAddedOrderBy(query('collId'), orderBy('a', 'asc')),
    queryWithAddedOrderBy(query('collId'), orderBy('a', 'desc')),
    queryWithAddedOrderBy(
      queryWithAddedOrderBy(query('collId'), orderBy('a', 'desc')),
      orderBy('__name__')
    ),
    queryWithAddedOrderBy(
      queryWithAddedFilter(
        query('collId'),
        filter('a', 'array-contains-any', ['a'])
      ),
      orderBy('b')
    )
  ];

  it('can use merge join', () => {
    let q = queryWithAddedFilter(
      queryWithAddedFilter(query('collId'), filter('a', '==', 1)),
      filter('b', '==', 2)
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);
    validateServesTarget(q, 'b', IndexKind.ASCENDING);

    q = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(query('collId'), filter('a', '==', 1)),
        filter('b', '==', 2)
      ),
      orderBy('__name__', 'desc')
    );
    validateServesTarget(
      q,
      'a',
      IndexKind.ASCENDING,
      '__name__',
      IndexKind.DESCENDING
    );
    validateServesTarget(
      q,
      'b',
      IndexKind.ASCENDING,
      '__name__',
      IndexKind.DESCENDING
    );
  });

  it('can use partial index', () => {
    let q = queryWithAddedOrderBy(query('collId'), orderBy('a'));
    validateServesTarget(q, 'a', IndexKind.ASCENDING);

    q = queryWithAddedOrderBy(
      queryWithAddedOrderBy(query('collId'), orderBy('a')),
      orderBy('b')
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);
    validateServesTarget(q, 'a', IndexKind.ASCENDING, 'b', IndexKind.ASCENDING);
  });

  it('cannot use overspecified index', () => {
    const q = queryWithAddedOrderBy(query('collId'), orderBy('a'));
    validateServesTarget(q, 'a', IndexKind.ASCENDING);
    validateDoesNotServeTarget(
      q,
      'a',
      IndexKind.ASCENDING,
      'b',
      IndexKind.ASCENDING
    );
  });

  it('equalities with default order', () => {
    for (const query of queriesWithEqualities) {
      validateServesTarget(query, 'a', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'b', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'a', IndexKind.CONTAINS);
    }
  });

  it('equalities with ascending order', () => {
    const queriesWithEqualitiesAndAscendingOrder = queriesWithEqualities.map(
      q => queryWithAddedOrderBy(q, orderBy('a', 'asc'))
    );

    for (const query of queriesWithEqualitiesAndAscendingOrder) {
      validateServesTarget(query, 'a', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'b', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'a', IndexKind.CONTAINS);
    }
  });

  it('equalities with descending order', () => {
    const queriesWithEqualitiesAndDescendingOrder = queriesWithEqualities.map(
      q => queryWithAddedOrderBy(q, orderBy('a', 'desc'))
    );

    for (const query of queriesWithEqualitiesAndDescendingOrder) {
      validateServesTarget(query, 'a', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'b', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'a', IndexKind.CONTAINS);
    }
  });

  it('inequalities with default order', () => {
    for (const query of queriesWithInequalities) {
      validateServesTarget(query, 'a', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'b', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'a', IndexKind.CONTAINS);
    }
  });

  it('inequalities with ascending order', () => {
    const queriesWithInequalitiesAndAscendingOrder =
      queriesWithInequalities.map(q =>
        queryWithAddedOrderBy(q, orderBy('a', 'asc'))
      );

    for (const query of queriesWithInequalitiesAndAscendingOrder) {
      validateServesTarget(query, 'a', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'b', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'a', IndexKind.CONTAINS);
    }
  });

  it('inequalities with descending order', () => {
    const queriesWithInequalitiesAndDescendingOrder =
      queriesWithInequalities.map(q =>
        queryWithAddedOrderBy(q, orderBy('a', 'desc'))
      );

    for (const query of queriesWithInequalitiesAndDescendingOrder) {
      validateServesTarget(query, 'a', IndexKind.DESCENDING);
      validateDoesNotServeTarget(query, 'b', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'a', IndexKind.CONTAINS);
    }
  });

  it('inequality uses single field index', () => {
    const q = queryWithAddedFilter(
      queryWithAddedFilter(query('collId'), filter('a', '>', 1)),
      filter('a', '<', 10)
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);
  });

  it('is query uses merge join', () => {
    const q = queryWithAddedFilter(
      queryWithAddedFilter(query('collId'), filter('a', 'in', [1, 2])),
      filter('b', '==', 5)
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);
    validateServesTarget(q, 'b', IndexKind.ASCENDING);
    validateServesTarget(q, 'a', IndexKind.ASCENDING, 'b', IndexKind.ASCENDING);
  });

  it('validates collection', () => {
    {
      const targetIndexMatcher = new TargetIndexMatcher(
        queryToTarget(query('collId'))
      );
      const index = fieldIndex('collId');
      expect(() => targetIndexMatcher.servedByIndex(index)).to.not.throw;
    }

    {
      const targetIndexMatcher = new TargetIndexMatcher(
        queryToTarget(newQueryForCollectionGroup('collId'))
      );
      const index = fieldIndex('collId');
      expect(() => targetIndexMatcher.servedByIndex(index)).to.not.throw;
    }

    {
      const targetIndexMatcher = new TargetIndexMatcher(
        queryToTarget(query('collId2'))
      );
      const index = fieldIndex('collId');
      expect(() => targetIndexMatcher.servedByIndex(index)).to.throw(
        'Collection IDs do not match'
      );
    }
  });

  it('with array-contains', () => {
    for (const query of queriesWithArrayContains) {
      validateDoesNotServeTarget(query, 'a', IndexKind.ASCENDING);
      validateDoesNotServeTarget(query, 'a', IndexKind.ASCENDING);
      validateServesTarget(query, 'a', IndexKind.CONTAINS);
    }
  });

  it('array-contains is independent', () => {
    const q = queryWithAddedOrderBy(
      queryWithAddedFilter(
        query('collId'),
        filter('value', 'array-contains', 'foo')
      ),
      orderBy('value')
    );
    validateServesTarget(
      q,
      'value',
      IndexKind.CONTAINS,
      'value',
      IndexKind.ASCENDING
    );
    validateServesTarget(
      q,
      'value',
      IndexKind.ASCENDING,
      'value',
      IndexKind.CONTAINS
    );
  });

  it('with array-contains and order by', () => {
    const queriesMultipleFilters = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(
          query('collId'),
          filter('a', 'array-contains', 'a')
        ),
        filter('a', '>', 'b')
      ),
      orderBy('a', 'asc')
    );
    validateServesTarget(
      queriesMultipleFilters,
      'a',
      IndexKind.CONTAINS,
      'a',
      IndexKind.ASCENDING
    );
  });

  it('with equality and descending order', () => {
    const q = queryWithAddedOrderBy(
      queryWithAddedFilter(query('collId'), filter('a', '==', 1)),
      orderBy('__name__', 'desc')
    );
    validateServesTarget(
      q,
      'a',
      IndexKind.ASCENDING,
      '__name__',
      IndexKind.DESCENDING
    );
  });

  it('with multiple equalities', () => {
    const queriesMultipleFilters = queryWithAddedFilter(
      queryWithAddedFilter(query('collId'), filter('a1', '==', 'a')),
      filter('a2', '==', 'b')
    );
    validateServesTarget(
      queriesMultipleFilters,
      'a1',
      IndexKind.ASCENDING,
      'a2',
      IndexKind.ASCENDING
    );
    validateServesTarget(
      queriesMultipleFilters,
      'a2',
      IndexKind.ASCENDING,
      'a1',
      IndexKind.ASCENDING
    );
    validateDoesNotServeTarget(
      queriesMultipleFilters,
      'a1',
      IndexKind.ASCENDING,
      'a2',
      IndexKind.ASCENDING,
      'a3',
      IndexKind.ASCENDING
    );
  });

  it('with multiple equalities and inequality', () => {
    let queriesMultipleFilters = queryWithAddedFilter(
      queryWithAddedFilter(
        queryWithAddedFilter(query('collId'), filter('equality1', '==', 'a')),
        filter('equality2', '==', 'b')
      ),
      filter('inequality', '>=', 'c')
    );
    validateServesTarget(
      queriesMultipleFilters,
      'equality1',
      IndexKind.ASCENDING,
      'equality2',
      IndexKind.ASCENDING,
      'inequality',
      IndexKind.ASCENDING
    );
    validateServesTarget(
      queriesMultipleFilters,
      'equality2',
      IndexKind.ASCENDING,
      'equality1',
      IndexKind.ASCENDING,
      'inequality',
      IndexKind.ASCENDING
    );
    validateDoesNotServeTarget(
      queriesMultipleFilters,
      'equality2',
      IndexKind.ASCENDING,
      'inequality',
      IndexKind.ASCENDING,
      'equality1',
      IndexKind.ASCENDING
    );

    queriesMultipleFilters = queryWithAddedFilter(
      queryWithAddedFilter(
        queryWithAddedFilter(query('collId'), filter('equality1', '==', 'a')),
        filter('inequality', '>=', 'c')
      ),
      filter('equality2', '==', 'b')
    );
    validateServesTarget(
      queriesMultipleFilters,
      'equality1',
      IndexKind.ASCENDING,
      'equality2',
      IndexKind.ASCENDING,
      'inequality',
      IndexKind.ASCENDING
    );
    validateServesTarget(
      queriesMultipleFilters,
      'equality2',
      IndexKind.ASCENDING,
      'equality1',
      IndexKind.ASCENDING,
      'inequality',
      IndexKind.ASCENDING
    );
    validateDoesNotServeTarget(
      queriesMultipleFilters,
      'equality1',
      IndexKind.ASCENDING,
      'inequality',
      IndexKind.ASCENDING,
      'equality2',
      IndexKind.ASCENDING
    );
  });

  it('with orderBy', () => {
    let q = queryWithAddedOrderBy(query('collId'), orderBy('a'));
    validateServesTarget(q, 'a', IndexKind.ASCENDING);
    validateDoesNotServeTarget(q, 'a', IndexKind.DESCENDING);

    q = queryWithAddedOrderBy(query('collId'), orderBy('a', 'desc'));
    validateDoesNotServeTarget(q, 'a', IndexKind.ASCENDING);
    validateServesTarget(q, 'a', IndexKind.DESCENDING);

    q = queryWithAddedOrderBy(
      queryWithAddedOrderBy(query('collId'), orderBy('a')),
      orderBy('__name__')
    );
    validateServesTarget(
      q,
      'a',
      IndexKind.ASCENDING,
      '__name__',
      IndexKind.ASCENDING
    );
    validateDoesNotServeTarget(
      q,
      'a',
      IndexKind.ASCENDING,
      '__name__',
      IndexKind.DESCENDING
    );
  });

  it('with not equals', () => {
    let q = queryWithAddedFilter(query('collId'), filter('a', '!=', 1));
    validateServesTarget(q, 'a', IndexKind.ASCENDING);

    q = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedFilter(query('collId'), filter('a', '!=', 1)),
        orderBy('a')
      ),
      orderBy('b')
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING, 'b', IndexKind.ASCENDING);
  });

  it('with multiple filters', () => {
    const queriesMultipleFilters = queryWithAddedFilter(
      queryWithAddedFilter(query('collId'), filter('a', '==', 'a')),
      filter('b', '>', 'b')
    );
    validateServesTarget(queriesMultipleFilters, 'a', IndexKind.ASCENDING);
    validateServesTarget(
      queriesMultipleFilters,
      'a',
      IndexKind.ASCENDING,
      'b',
      IndexKind.ASCENDING
    );
  });

  it('multiple filters require matching prefix', () => {
    const queriesMultipleFilters = queryWithAddedFilter(
      queryWithAddedFilter(query('collId'), filter('a', '==', 'a')),
      filter('b', '>', 'b')
    );

    validateServesTarget(queriesMultipleFilters, 'b', IndexKind.ASCENDING);
    validateDoesNotServeTarget(
      queriesMultipleFilters,
      'c',
      IndexKind.ASCENDING,
      'a',
      IndexKind.ASCENDING
    );
  });

  it('with multiple filters and orderBy', () => {
    const queriesMultipleFilters = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(query('collId'), filter('a1', '==', 'a')),
        filter('a2', '>', 'b')
      ),
      orderBy('a2', 'asc')
    );
    validateServesTarget(
      queriesMultipleFilters,
      'a1',
      IndexKind.ASCENDING,
      'a2',
      IndexKind.ASCENDING
    );
  });

  it('with multiple inequalities', () => {
    const q = queryWithAddedFilter(
      queryWithAddedFilter(
        queryWithAddedFilter(query('collId'), filter('a', '>=', 1)),
        filter('a', '==', 5)
      ),
      filter('a', '<=', 10)
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);
  });

  it('with multiple notIns', () => {
    const q = queryWithAddedFilter(
      queryWithAddedFilter(query('collId'), filter('a', 'not-in', [1, 2, 3])),
      filter('a', '>=', 2)
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);
  });

  it('with multiple orderBys', () => {
    let q = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedOrderBy(query('collId'), orderBy('fff')),
        orderBy('bar', 'desc')
      ),
      orderBy('__name__')
    );
    validateServesTarget(
      q,
      'fff',
      IndexKind.ASCENDING,
      'bar',
      IndexKind.DESCENDING,
      '__name__',
      IndexKind.ASCENDING
    );
    validateDoesNotServeTarget(
      q,
      'fff',
      IndexKind.ASCENDING,
      '__name__',
      IndexKind.ASCENDING,
      'bar',
      IndexKind.DESCENDING
    );

    q = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedOrderBy(query('collId'), orderBy('foo')),
        orderBy('bar')
      ),
      orderBy('__name__', 'desc')
    );
    validateServesTarget(
      q,
      'foo',
      IndexKind.ASCENDING,
      'bar',
      IndexKind.ASCENDING,
      '__name__',
      IndexKind.DESCENDING
    );
    validateDoesNotServeTarget(
      q,
      'foo',
      IndexKind.ASCENDING,
      '__name__',
      IndexKind.DESCENDING,
      'bar',
      IndexKind.ASCENDING
    );
  });

  it('with in and notIn', () => {
    const q = queryWithAddedFilter(
      queryWithAddedFilter(query('collId'), filter('a', 'not-in', [1, 2, 3])),
      filter('b', 'in', [1, 2, 3])
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);
    validateServesTarget(q, 'b', IndexKind.ASCENDING);
    validateServesTarget(q, 'b', IndexKind.ASCENDING, 'a', IndexKind.ASCENDING);
    // If provided, equalities have to come first
    validateDoesNotServeTarget(
      q,
      'a',
      IndexKind.ASCENDING,
      'b',
      IndexKind.ASCENDING
    );
  });

  it('with equality and different order by', () => {
    let q = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(query('collId'), filter('foo', '==', '')),
        filter('bar', '==', '')
      ),
      orderBy('qux')
    );
    validateServesTarget(
      q,
      'foo',
      IndexKind.ASCENDING,
      'bar',
      IndexKind.ASCENDING,
      'qux',
      IndexKind.ASCENDING
    );

    q = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedFilter(
          queryWithAddedFilter(
            queryWithAddedFilter(query('collId'), filter('aaa', '==', '')),
            filter('qqq', '==', '')
          ),
          filter('ccc', '==', '')
        ),
        orderBy('fff', 'desc')
      ),
      orderBy('bbb')
    );
    validateServesTarget(
      q,
      'aaa',
      IndexKind.ASCENDING,
      'qqq',
      IndexKind.ASCENDING,
      'ccc',
      IndexKind.ASCENDING,
      'fff',
      IndexKind.DESCENDING
    );
  });

  it('with equals and not in', () => {
    const q = queryWithAddedFilter(
      queryWithAddedFilter(query('collId'), filter('a', '==', 1)),
      filter('b', 'not-in', [1, 2, 3])
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING, 'b', IndexKind.ASCENDING);
  });

  it('with in and orderBy', () => {
    const q = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedFilter(query('collId'), filter('a', 'not-in', [1, 2, 3])),
        orderBy('a')
      ),
      orderBy('b')
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING, 'b', IndexKind.ASCENDING);
  });

  it('with in and orderBy on same field', () => {
    const q = queryWithAddedOrderBy(
      queryWithAddedFilter(query('collId'), filter('a', 'in', [1, 2, 3])),
      orderBy('a')
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);
  });

  it('with equality and inequality on the same field', () => {
    let q = queryWithAddedFilter(
      queryWithAddedFilter(query('collId'), filter('a', '>=', 5)),
      filter('a', '==', 0)
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);

    q = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(query('collId'), filter('a', '>=', 5)),
        filter('a', '==', 0)
      ),
      orderBy('a')
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);

    q = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedFilter(
          queryWithAddedFilter(query('collId'), filter('a', '>=', 5)),
          filter('a', '==', 0)
        ),
        orderBy('a')
      ),
      orderBy('__name__')
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);

    q = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedFilter(
          queryWithAddedFilter(query('collId'), filter('a', '>=', 5)),
          filter('a', '==', 0)
        ),
        orderBy('a')
      ),
      orderBy('__name__', 'desc')
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);

    q = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedOrderBy(
          queryWithAddedFilter(
            queryWithAddedFilter(query('collId'), filter('a', '>=', 5)),
            filter('a', '==', 0)
          ),
          orderBy('a')
        ),
        orderBy('b')
      ),
      orderBy('__name__', 'desc')
    );
    validateServesTarget(
      q,
      'a',
      IndexKind.ASCENDING,
      'b',
      IndexKind.DESCENDING
    );

    q = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedFilter(
          queryWithAddedFilter(query('collId'), filter('a', '>=', 5)),
          filter('a', '==', 0)
        ),
        orderBy('a')
      ),
      orderBy('__name__', 'desc')
    );
    validateServesTarget(q, 'a', IndexKind.ASCENDING);
  });

  describe('buildTargetIndex()', () => {
    it('queries with equalities', () =>
      queriesWithEqualities.forEach(
        validateBuildTargetIndexCreateFullMatchIndex
      ));

    it('queries with inequalities', () =>
      queriesWithInequalities.forEach(
        validateBuildTargetIndexCreateFullMatchIndex
      ));

    it('queries with array contains', () =>
      queriesWithArrayContains.forEach(
        validateBuildTargetIndexCreateFullMatchIndex
      ));

    it('queries with order bys', () =>
      queriesWithOrderBy.forEach(validateBuildTargetIndexCreateFullMatchIndex));

    it('queries with inequalities uses single field index', () =>
      validateBuildTargetIndexCreateFullMatchIndex(
        queryWithAddedFilter(
          queryWithAddedFilter(query('collId'), filter('a', '>', 1)),
          filter('a', '<', 10)
        )
      ));

    it('query of a collection', () =>
      validateBuildTargetIndexCreateFullMatchIndex(query('collId')));

    it('query with array contains and order by', () =>
      validateBuildTargetIndexCreateFullMatchIndex(
        queryWithAddedOrderBy(
          queryWithAddedFilter(
            queryWithAddedFilter(
              query('collId'),
              filter('a', 'array-contains', 'a')
            ),
            filter('a', '>', 'b')
          ),
          orderBy('a', 'asc')
        )
      ));

    it('query with equality and descending order', () =>
      validateBuildTargetIndexCreateFullMatchIndex(
        queryWithAddedOrderBy(
          queryWithAddedFilter(query('collId'), filter('a', '==', 1)),
          orderBy('__name__', 'desc')
        )
      ));

    it('query with multiple equalities', () =>
      validateBuildTargetIndexCreateFullMatchIndex(
        queryWithAddedFilter(
          queryWithAddedFilter(query('collId'), filter('a1', '==', 'a')),
          filter('a2', '==', 'b')
        )
      ));

    describe('query with multiple equalities and inequality', () => {
      it('inequality last', () =>
        validateBuildTargetIndexCreateFullMatchIndex(
          queryWithAddedFilter(
            queryWithAddedFilter(
              queryWithAddedFilter(
                query('collId'),
                filter('equality1', '==', 'a')
              ),
              filter('equality2', '==', 'b')
            ),
            filter('inequality', '>=', 'c')
          )
        ));

      it('inequality in middle', () =>
        validateBuildTargetIndexCreateFullMatchIndex(
          queryWithAddedFilter(
            queryWithAddedFilter(
              queryWithAddedFilter(
                query('collId'),
                filter('equality1', '==', 'a')
              ),
              filter('inequality', '>=', 'c')
            ),
            filter('equality2', '==', 'b')
          )
        ));
    });

    describe('query with multiple filters', () => {
      it('== and > on different fields', () =>
        validateBuildTargetIndexCreateFullMatchIndex(
          queryWithAddedOrderBy(
            queryWithAddedFilter(
              queryWithAddedFilter(query('collId'), filter('a1', '==', 'a')),
              filter('a2', '>', 'b')
            ),
            orderBy('a2', 'asc')
          )
        ));

      it('>=, ==, and <= filters on the same field', () =>
        validateBuildTargetIndexCreateFullMatchIndex(
          queryWithAddedFilter(
            queryWithAddedFilter(
              queryWithAddedFilter(query('collId'), filter('a', '>=', 1)),
              filter('a', '==', 5)
            ),
            filter('a', '<=', 10)
          )
        ));

      it('not-in and >= on the same field', () =>
        validateBuildTargetIndexCreateFullMatchIndex(
          queryWithAddedFilter(
            queryWithAddedFilter(
              query('collId'),
              filter('a', 'not-in', [1, 2, 3])
            ),
            filter('a', '>=', 2)
          )
        ));
    });

    describe('query with multiple order-bys', () => {
      it('order by fff, bar desc, __name__', () =>
        validateBuildTargetIndexCreateFullMatchIndex(
          queryWithAddedOrderBy(
            queryWithAddedOrderBy(
              queryWithAddedOrderBy(query('collId'), orderBy('fff')),
              orderBy('bar', 'desc')
            ),
            orderBy('__name__')
          )
        ));

      it('order by foo, bar, __name__ desc', () =>
        validateBuildTargetIndexCreateFullMatchIndex(
          queryWithAddedOrderBy(
            queryWithAddedOrderBy(
              queryWithAddedOrderBy(query('collId'), orderBy('foo')),
              orderBy('bar')
            ),
            orderBy('__name__', 'desc')
          )
        ));
    });

    it('query with in and not in filters', () =>
      validateBuildTargetIndexCreateFullMatchIndex(
        queryWithAddedFilter(
          queryWithAddedFilter(
            query('collId'),
            filter('a', 'not-in', [1, 2, 3])
          ),
          filter('b', 'in', [1, 2, 3])
        )
      ));

    describe('query with equality and different order-by', () => {
      it('filter on foo and bar, order by qux', () =>
        validateBuildTargetIndexCreateFullMatchIndex(
          queryWithAddedOrderBy(
            queryWithAddedFilter(
              queryWithAddedFilter(query('collId'), filter('foo', '==', '')),
              filter('bar', '==', '')
            ),
            orderBy('qux')
          )
        ));

      it('filter on aaa, qqq, ccc, order by fff, bbb', () =>
        validateBuildTargetIndexCreateFullMatchIndex(
          queryWithAddedOrderBy(
            queryWithAddedOrderBy(
              queryWithAddedFilter(
                queryWithAddedFilter(
                  queryWithAddedFilter(
                    query('collId'),
                    filter('aaa', '==', '')
                  ),
                  filter('qqq', '==', '')
                ),
                filter('ccc', '==', '')
              ),
              orderBy('fff', 'desc')
            ),
            orderBy('bbb')
          )
        ));
    });

    it('query with equals and not-in filters', () =>
      validateBuildTargetIndexCreateFullMatchIndex(
        queryWithAddedFilter(
          queryWithAddedFilter(query('collId'), filter('a', '==', '1')),
          filter('b', 'not-in', [1, 2, 3])
        )
      ));

    describe('query with in and order-by', () => {
      it('on different fields', () =>
        validateBuildTargetIndexCreateFullMatchIndex(
          queryWithAddedOrderBy(
            queryWithAddedOrderBy(
              queryWithAddedFilter(
                query('collId'),
                filter('a', 'not-in', [1, 2, 3])
              ),
              orderBy('a')
            ),
            orderBy('b')
          )
        ));

      it('on the same field', () =>
        validateBuildTargetIndexCreateFullMatchIndex(
          queryWithAddedOrderBy(
            queryWithAddedFilter(query('collId'), filter('a', 'in', [1, 2, 3])),
            orderBy('a')
          )
        ));
    });

    describe('query with multiple inequality', () => {
      it('returns null', () => {
        const q = queryWithAddedFilter(
          queryWithAddedFilter(query('collId'), filter('a', '>=', 1)),
          filter('b', '<=', 10)
        );
        const target = queryToTarget(q);
        const targetIndexMatcher = new TargetIndexMatcher(target);
        expect(targetIndexMatcher.hasMultipleInequality).is.true;
        const actualIndex = targetIndexMatcher.buildTargetIndex();
        expect(actualIndex).is.null;
      });
    });

    function validateBuildTargetIndexCreateFullMatchIndex(q: Query): void {
      const target = queryToTarget(q);
      const targetIndexMatcher = new TargetIndexMatcher(target);
      expect(targetIndexMatcher.hasMultipleInequality).is.false;
      const actualIndex = targetIndexMatcher.buildTargetIndex();
      expect(actualIndex).is.not.null;
      expect(targetIndexMatcher.servedByIndex(actualIndex as FieldIndex)).is
        .true;
      expect(
        (actualIndex as FieldIndex).fields.length >=
          targetGetSegmentCount(target)
      );
    }
  });

  function validateServesTarget(
    query: Query,
    field: string,
    kind: IndexKind,
    ...fieldsAndKind: unknown[]
  ): void {
    const expectedIndex = fieldIndex('collId', {
      fields: convertToFieldsArray(field, kind, fieldsAndKind)
    });
    const targetIndexMatcher = new TargetIndexMatcher(queryToTarget(query));
    expect(targetIndexMatcher.servedByIndex(expectedIndex)).to.be.true;
  }

  function validateDoesNotServeTarget(
    query: Query,
    field: string,
    kind: IndexKind,
    ...fieldsAndKind: unknown[]
  ): void {
    const expectedIndex = fieldIndex('collId', {
      fields: convertToFieldsArray(field, kind, fieldsAndKind)
    });
    const targetIndexMatcher = new TargetIndexMatcher(queryToTarget(query));
    expect(targetIndexMatcher.servedByIndex(expectedIndex)).to.be.false;
  }

  function convertToFieldsArray(
    field: string,
    kind: IndexKind,
    fieldsAndKind: unknown[]
  ): Array<[field: string, kind: IndexKind]> {
    return [
      [field, kind],
      ...(fieldsAndKind.reduce((previous: unknown[][], current) => {
        if (
          previous.length === 0 ||
          previous[previous.length - 1].length === 2
        ) {
          previous.push([]);
        }
        previous[previous.length - 1].push(current);
        return previous;
      }, []) as Array<[field: string, kind: IndexKind]>)
    ];
  }
});
