/**
 * @license
 * Copyright 2019 Google LLC
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

import { User } from '../../../src/auth/user';
import { FieldFilter } from '../../../src/core/filter';
import {
  LimitType,
  newQueryForCollectionGroup,
  Query,
  queryToTarget,
  queryWithAddedFilter,
  queryWithAddedOrderBy,
  queryWithEndAt,
  queryWithLimit,
  queryWithStartAt
} from '../../../src/core/query';
import {
  displayNameForIndexType,
  IndexType
} from '../../../src/local/index_manager';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { Persistence } from '../../../src/local/persistence';
import { documentMap } from '../../../src/model/collections';
import { Document } from '../../../src/model/document';
import {
  IndexKind,
  IndexOffset,
  IndexState
} from '../../../src/model/field_index';
import { JsonObject } from '../../../src/model/object_value';
import { canonicalId } from '../../../src/model/values';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  bound,
  deletedDoc,
  doc,
  fieldIndex,
  filter,
  key,
  orderBy,
  orFilter,
  path,
  query,
  version,
  wrap
} from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestIndexManager } from './test_index_manager';
import {
  IndexedDbIndexManager,
  IndexedDbIndexManagerFieldIndexPlugin,
  IndexedDbIndexManagerFieldIndexPluginFactory
} from '../../../src/local/indexeddb_index_manager';
import { DatabaseId } from '../../../src/core/database_info';
import { TEST_DATABASE_ID } from './persistence_test_helpers';

describe('index_manager.ts top-level functions', () => {
  describe('displayNameForIndexType()', () => {
    it('IndexType.NONE', () =>
      expect(displayNameForIndexType(IndexType.NONE)).to.equal('NONE'));

    it('IndexType.FULL', () =>
      expect(displayNameForIndexType(IndexType.FULL)).to.equal('FULL'));

    it('IndexType.PARTIAL', () =>
      expect(displayNameForIndexType(IndexType.PARTIAL)).to.equal('PARTIAL'));

    it('invalid IndexType', () =>
      // @ts-expect-error: specifying a string to displayNameForIndexType()
      // causes a TypeScript compiler error, but is handled gracefully.
      expect(displayNameForIndexType('zzyzx')).to.equal(
        '[unknown IndexType: zzyzx]'
      ));
  });
});

describe('MemoryIndexManager', async () => {
  genericIndexManagerTests(persistenceHelpers.testMemoryEagerPersistence);
});

describe('IndexedDbIndexManager', async () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbIndexManager tests.');
    return;
  }

  let persistencePromise: Promise<Persistence>;
  beforeEach(async () => {
    persistencePromise = persistenceHelpers.testIndexedDbPersistence();
  });

  async function getIndexManager(
    user = User.UNAUTHENTICATED
  ): Promise<TestIndexManager> {
    const persistence = await persistencePromise;
    return new TestIndexManager(persistence, persistence.getIndexManager(user));
  }

  async function getIndexedDbIndexManager(
    user = User.UNAUTHENTICATED
  ): Promise<IndexedDbIndexManager> {
    const persistence = await persistencePromise;
    const indexManager = persistence.getIndexManager(user);
    if (!(indexManager instanceof IndexedDbIndexManager)) {
      throw new Error(
        'persistence.getIndexManager() should have returned ' +
          'an instance of IndexedDbIndexManager'
      );
    }
    return indexManager;
  }

  genericIndexManagerTests(() => persistencePromise);

  let indexManager: TestIndexManager;

  beforeEach(async () => {
    indexManager = await getIndexManager();
  });

  it('can add indexes', async () => {
    await indexManager.addFieldIndex(fieldIndex('coll1'));

    const fieldIndexes = await indexManager.getFieldIndexes();
    expect(fieldIndexes).to.have.length(1);
    expect(fieldIndexes[0]).to.deep.equal(fieldIndex('coll1', { id: 1 }));
  });

  it('uses auto-incrementing index id', async () => {
    await indexManager.addFieldIndex(fieldIndex('coll1'));
    await indexManager.addFieldIndex(fieldIndex('coll2'));

    const fieldIndexes = await indexManager.getFieldIndexes();
    expect(fieldIndexes).to.have.length(2);
    expect(fieldIndexes[0]).to.deep.equal(fieldIndex('coll1', { id: 1 }));
    expect(fieldIndexes[1]).to.deep.equal(fieldIndex('coll2', { id: 2 }));
  });

  it('can get indexes', async () => {
    let fieldIndexes = await indexManager.getFieldIndexes('coll1');
    expect(fieldIndexes).to.have.length(0);

    await indexManager.addFieldIndex(
      fieldIndex('coll1', { fields: [['value', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll2', { fields: [['value', IndexKind.CONTAINS]] })
    );

    fieldIndexes = await indexManager.getFieldIndexes('coll1');
    expect(fieldIndexes).to.have.length(1);
    expect(fieldIndexes[0]).to.deep.equal(
      fieldIndex('coll1', {
        id: 1,
        fields: [['value', IndexKind.ASCENDING]]
      })
    );

    await indexManager.addFieldIndex(
      fieldIndex('coll1', { fields: [['newValue', IndexKind.CONTAINS]] })
    );

    fieldIndexes = await indexManager.getFieldIndexes('coll1');
    expect(fieldIndexes).to.have.length(2);
    expect(fieldIndexes[0]).to.deep.equal(
      fieldIndex('coll1', {
        id: 1,
        fields: [['value', IndexKind.ASCENDING]]
      })
    );
    expect(fieldIndexes[1]).to.deep.equal(
      fieldIndex('coll1', {
        id: 3,
        fields: [['newValue', IndexKind.CONTAINS]]
      })
    );
  });

  it('can update collection group', async () => {
    await indexManager.addFieldIndex(fieldIndex('coll1'));
    await indexManager.addFieldIndex(fieldIndex('coll1'));
    await indexManager.addFieldIndex(fieldIndex('coll2'));

    let fieldIndexes = await indexManager.getFieldIndexes();
    expect(fieldIndexes[0].indexState).to.deep.equal(
      new IndexState(/* sequenceNumber= */ 0, IndexOffset.min())
    );
    expect(fieldIndexes[1].indexState).to.deep.equal(
      new IndexState(/* sequenceNumber= */ 0, IndexOffset.min())
    );
    expect(fieldIndexes[2].indexState).to.deep.equal(
      new IndexState(/* sequenceNumber= */ 0, IndexOffset.min())
    );

    const newOffset = new IndexOffset(version(1337), key('coll1/doc'), 42);
    await indexManager.updateCollectionGroup('coll1', newOffset);

    fieldIndexes = await indexManager.getFieldIndexes();
    expect(fieldIndexes[0].indexState).to.deep.equal(
      new IndexState(/* sequenceNumber= */ 1, newOffset)
    );
    expect(fieldIndexes[1].indexState).to.deep.equal(
      new IndexState(/* sequenceNumber= */ 1, newOffset)
    );
    expect(fieldIndexes[2].indexState).to.deep.equal(
      new IndexState(/* sequenceNumber= */ 0, IndexOffset.min())
    );
  });

  it('can get next collection group to update', async () => {
    let nextCollectionGroup =
      await indexManager.getNextCollectionGroupToUpdate();
    expect(nextCollectionGroup).to.be.null;

    await indexManager.addFieldIndex(fieldIndex('coll1'));
    await indexManager.addFieldIndex(fieldIndex('coll2'));

    nextCollectionGroup = await indexManager.getNextCollectionGroupToUpdate();
    expect(nextCollectionGroup).to.equal('coll1');

    await indexManager.updateCollectionGroup('coll1', IndexOffset.min());

    nextCollectionGroup = await indexManager.getNextCollectionGroupToUpdate();
    expect(nextCollectionGroup).to.equal('coll2');

    await indexManager.updateCollectionGroup('coll2', IndexOffset.min());
    nextCollectionGroup = await indexManager.getNextCollectionGroupToUpdate();
    expect(nextCollectionGroup).to.equal('coll1');
  });

  it('deleting field index removes entry from collection group', async () => {
    const offsetBefore = new IndexOffset(version(1337), key('coll1/doc'), 42);
    const offsetAfter = IndexOffset.min();

    await indexManager.addFieldIndex(fieldIndex('coll1'));
    const actualIndex = (await indexManager.getFieldIndexes())[0];

    await indexManager.updateCollectionGroup('coll1', offsetBefore);
    let fieldIndexes = await indexManager.getFieldIndexes();
    expect(fieldIndexes[0].indexState).to.deep.equal(
      new IndexState(1, offsetBefore)
    );

    // Delete and re-add the index
    await indexManager.deleteFieldIndex(actualIndex);
    await indexManager.addFieldIndex(fieldIndex('coll1'));

    fieldIndexes = await indexManager.getFieldIndexes();
    expect(fieldIndexes[0].indexState).to.deep.equal(
      new IndexState(0, offsetAfter)
    );
  });

  it('deleting field index removes entry from getNextCollectionGroupToUpdate()', async () => {
    await indexManager.addFieldIndex(fieldIndex('coll1'));
    expect(await indexManager.getNextCollectionGroupToUpdate()).to.equal(
      'coll1'
    );

    const actualIndex = (await indexManager.getFieldIndexes())[0];
    await indexManager.deleteFieldIndex(actualIndex);

    expect(await indexManager.getNextCollectionGroupToUpdate()).to.equal(null);
  });

  it('persist index offset', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll1', { fields: [['value', IndexKind.ASCENDING]] })
    );
    const offset = new IndexOffset(version(20), key('coll/doc'), 42);
    await indexManager.updateCollectionGroup('coll1', offset);

    indexManager = await getIndexManager(User.UNAUTHENTICATED);

    const indexes = await indexManager.getFieldIndexes('coll1');
    expect(indexes).to.have.length(1);
    expect(indexes[0].indexState.offset).to.deep.equal(offset);
  });

  it('changes user', async () => {
    let indexManager = await getIndexManager(new User('user1'));

    const user1Offset = new IndexOffset(version(1337), key('coll1/doc'), 42);
    const user2Offset = IndexOffset.min();

    await indexManager.addFieldIndex(fieldIndex('coll1'));
    await indexManager.updateCollectionGroup('coll1', user1Offset);

    let fieldIndexes = await indexManager.getFieldIndexes();
    expect(fieldIndexes[0].indexState).to.deep.equal(
      new IndexState(1, user1Offset)
    );

    indexManager = await getIndexManager(new User('user2'));
    fieldIndexes = await indexManager.getFieldIndexes();
    expect(fieldIndexes[0].indexState).to.deep.equal(
      new IndexState(0, user2Offset)
    );

    indexManager = await getIndexManager(new User('user1'));
    fieldIndexes = await indexManager.getFieldIndexes();
    expect(fieldIndexes[0].indexState).to.deep.equal(
      new IndexState(1, user1Offset)
    );
  });

  it('adds documents', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['exists', IndexKind.ASCENDING]] })
    );
    await addDoc('coll/doc1', { 'exists': 1 });
    await addDoc('coll/doc2', {});
  });

  it('applies orderBy', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['count', IndexKind.ASCENDING]] })
    );
    await addDoc('coll/val1', { 'count': 1 });
    await addDoc('coll/val2', { 'not-count': 2 });
    await addDoc('coll/val3', { 'count': 3 });
    const q = queryWithAddedOrderBy(query('coll'), orderBy('count'));
    await verifyResults(q, 'coll/val1', 'coll/val3');
  });

  it('applies orderBy with not equals filter', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['count', IndexKind.ASCENDING]] })
    );
    await addDoc('coll/val1', { 'count': 1 });
    await addDoc('coll/val2', { 'count': 2 });
    const q = queryWithAddedOrderBy(
      queryWithAddedFilter(query('coll'), filter('count', '!=', 2)),
      orderBy('count')
    );
    await verifyResults(q, 'coll/val1');
  });

  it('applies equality filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(query('coll'), filter('count', '==', 2));
    await verifyResults(q, 'coll/val2');
  });

  it('applies nested field equality filter', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['a.b', IndexKind.ASCENDING]] })
    );
    await addDoc('coll/doc1', { 'a': { 'b': 1 } });
    await addDoc('coll/doc2', { 'a': { 'b': 2 } });
    const q = queryWithAddedFilter(query('coll'), filter('a.b', '==', 2));
    await verifyResults(q, 'coll/doc2');
  });

  it('applies not equals filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(query('coll'), filter('count', '!=', 2));
    await verifyResults(q, 'coll/val1', 'coll/val3');
  });

  it('applies equals with not equals filter', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['a', IndexKind.ASCENDING],
          ['b', IndexKind.ASCENDING]
        ]
      })
    );
    await addDoc('coll/val1', { 'a': 1, 'b': 1 });
    await addDoc('coll/val2', { 'a': 1, 'b': 2 });
    await addDoc('coll/val3', { 'a': 2, 'b': 1 });
    await addDoc('coll/val4', { 'a': 2, 'b': 2 });

    // Verifies that we apply the filter in the order of the field index
    let q = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('a', '==', 1)),
      filter('b', '!=', 1)
    );
    await verifyResults(q, 'coll/val2');

    q = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('b', '!=', 1)),
      filter('a', '==', 1)
    );
    await verifyResults(q, 'coll/val2');
  });

  it('applies array contains with not equals filter', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['a', IndexKind.CONTAINS],
          ['b', IndexKind.ASCENDING]
        ]
      })
    );
    await addDoc('coll/val1', { 'a': [1], 'b': 1 });
    await addDoc('coll/val2', { 'a': [1], 'b': 2 });
    await addDoc('coll/val3', { 'a': [2], 'b': 1 });
    await addDoc('coll/val4', { 'a': [2], 'b': 2 });

    const q = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('a', 'array-contains', 1)),
      filter('b', '!=', 1)
    );
    await verifyResults(q, 'coll/val2');
  });

  it('applies array contains with not equals filter on same field', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['a', IndexKind.CONTAINS],
          ['a', IndexKind.ASCENDING]
        ]
      })
    );
    await addDoc('coll/val1', { 'a': [1, 1] });
    await addDoc('coll/val2', { 'a': [1, 2] });
    await addDoc('coll/val3', { 'a': [2, 1] });
    await addDoc('coll/val4', { 'a': [2, 2] });

    const q = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('a', 'array-contains', 1)),
      filter('a', '!=', [1, 2])
    );
    await verifyResults(q, 'coll/val1', 'coll/val3');
  });

  it('applies equals with not equals filter on same field', async () => {
    await setUpSingleValueFilter();

    const filtersAndResults: Array<FieldFilter[] | string[]> = [
      [filter('count', '>', 1), filter('count', '!=', 2)],
      ['coll/val3'],
      [filter('count', '==', 1), filter('count', '!=', 2)],
      ['coll/val1'],
      [filter('count', '==', 1), filter('count', '!=', 1)],
      [],
      [filter('count', '>', 2), filter('count', '!=', 2)],
      ['coll/val3'],
      [filter('count', '>=', 2), filter('count', '!=', 2)],
      ['coll/val3'],
      [filter('count', '<=', 2), filter('count', '!=', 2)],
      ['coll/val1'],
      [filter('count', '<=', 2), filter('count', '!=', 1)],
      ['coll/val2'],
      [filter('count', '<', 2), filter('count', '!=', 2)],
      ['coll/val1'],
      [filter('count', '<', 2), filter('count', '!=', 1)],
      [],
      [filter('count', '>', 2), filter('count', 'not-in', [3])],
      [],
      [filter('count', '>=', 2), filter('count', 'not-in', [3])],
      ['coll/val2'],
      [filter('count', '>=', 2), filter('count', 'not-in', [3, 3])],
      ['coll/val2'],
      [
        filter('count', '>', 1),
        filter('count', '<', 3),
        filter('count', '!=', 2)
      ],
      [],
      [
        filter('count', '>=', 1),
        filter('count', '<', 3),
        filter('count', '!=', 2)
      ],
      ['coll/val1'],
      [
        filter('count', '>=', 1),
        filter('count', '<=', 3),
        filter('count', '!=', 2)
      ],
      ['coll/val1', 'coll/val3'],
      [
        filter('count', '>', 1),
        filter('count', '<=', 3),
        filter('count', '!=', 2)
      ],
      ['coll/val3']
    ];

    for (let i = 0; i < filtersAndResults.length; i += 2) {
      let q = query('coll');
      for (const filter of filtersAndResults[i] as FieldFilter[]) {
        q = queryWithAddedFilter(q, filter);
      }
      await verifyResults(q, ...(filtersAndResults[i + 1] as string[]));
    }
  });

  it('applies less than or equals filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(query('coll'), filter('count', '<=', 2));
    await verifyResults(q, 'coll/val1', 'coll/val2');
  });

  it('applies greater than or equals filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(query('coll'), filter('count', '>=', 2));
    await verifyResults(q, 'coll/val2', 'coll/val3');
  });

  it('applies greater than filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(query('coll'), filter('count', '>', 2));
    await verifyResults(q, 'coll/val3');
  });

  it('applies range filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('count', '>', 1)),
      filter('count', '<', 3)
    );
    await verifyResults(q, 'coll/val2');
  });

  it('applies startAt filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithStartAt(
      queryWithAddedOrderBy(query('coll'), orderBy('count')),
      bound([2], true)
    );
    await verifyResults(q, 'coll/val2', 'coll/val3');
  });

  it('applies startAt filter with notIn', async () => {
    await setUpSingleValueFilter();
    const q = queryWithStartAt(
      queryWithAddedOrderBy(
        queryWithAddedFilter(query('coll'), filter('count', '!=', 2)),
        orderBy('count')
      ),
      bound([2], true)
    );
    await verifyResults(q, 'coll/val3');
  });

  it('applies startAfter filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithStartAt(
      queryWithAddedOrderBy(query('coll'), orderBy('count')),
      bound([2], false)
    );
    await verifyResults(q, 'coll/val3');
  });

  it('applies endAt filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithEndAt(
      queryWithAddedOrderBy(query('coll'), orderBy('count')),
      bound([2], true)
    );
    await verifyResults(q, 'coll/val1', 'coll/val2');
  });

  it('applies endBefore filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithEndAt(
      queryWithAddedOrderBy(query('coll'), orderBy('count')),
      bound([2], false)
    );
    await verifyResults(q, 'coll/val1');
  });

  it('applies range with bound filter', async () => {
    await setUpSingleValueFilter();
    const startAt = queryWithEndAt(
      queryWithStartAt(
        queryWithAddedOrderBy(
          queryWithAddedFilter(
            queryWithAddedFilter(query('coll'), filter('count', '>=', 1)),
            filter('count', '<=', 3)
          ),
          orderBy('count')
        ),
        bound([1], false)
      ),
      bound([2], true)
    );
    await verifyResults(startAt, 'coll/val2');
  });

  it('applies in filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(
      query('coll'),
      filter('count', 'in', [1, 3])
    );
    await verifyResults(q, 'coll/val1', 'coll/val3');
  });

  it('applies not in filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(
      query('coll'),
      filter('count', 'not-in', [1, 2])
    );
    await verifyResults(q, 'coll/val3');
  });

  it('applies not in filter with greater than filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('count', '>', 1)),
      filter('count', 'not-in', [2])
    );
    await verifyResults(q, 'coll/val3');
  });

  it('applies not in filter with out of bounds greater than filter', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('count', '>', 2)),
      filter('count', 'not-in', [1])
    );
    await verifyResults(q, 'coll/val3');
  });

  it('applies array contains filter', async () => {
    await setUpArrayValueFilter();
    const q = queryWithAddedFilter(
      query('coll'),
      filter('values', 'array-contains', 1)
    );
    await verifyResults(q, 'coll/arr1');
  });

  it('applies array contains any filter', async () => {
    await setUpArrayValueFilter();
    const q = queryWithAddedFilter(
      query('coll'),
      filter('values', 'array-contains-any', [1, 2, 4])
    );
    await verifyResults(q, 'coll/arr1', 'coll/arr2');
  });

  it('validates that array contains filter only matches array', async () => {
    // Set up two field indexes. This causes two index entries to be written,
    // but our query should only use one index.
    await setUpArrayValueFilter();
    await setUpSingleValueFilter();
    await addDoc('coll/nonmatching', { 'values': 1 });
    const q = queryWithAddedFilter(
      query('coll'),
      filter('values', 'array-contains-any', [1])
    );
    await verifyResults(q, 'coll/arr1');
  });

  it('returns empty result when no index exists', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(
      query('coll'),
      filter('unknown', '==', true)
    );
    expect(await indexManager.getIndexType(queryToTarget(q))).to.equal(
      IndexType.NONE
    );
    expect(await indexManager.getDocumentsMatchingTarget(queryToTarget(q))).to
      .be.null;
  });

  it('handles when no matching filter exists', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(
      query('coll'),
      filter('unknown', '==', true)
    );

    expect(await indexManager.getIndexType(queryToTarget(q))).to.equal(
      IndexType.NONE
    );
    expect(await indexManager.getDocumentsMatchingTarget(queryToTarget(q))).to
      .be.null;
  });

  it('returns empty results when no matching documents exists', async () => {
    await setUpSingleValueFilter();
    const q = queryWithAddedFilter(query('coll'), filter('count', '==', -1));
    await verifyResults(q);
  });

  it('filters by field type', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['value', IndexKind.ASCENDING]] })
    );
    await addDoc('coll/boolean', { 'value': true });
    await addDoc('coll/string', { 'value': 'true' });
    await addDoc('coll/number', { 'value': 1 });
    const q = queryWithAddedFilter(query('coll'), filter('value', '==', true));
    await verifyResults(q, 'coll/boolean');
  });

  it('supports collection group indexes', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll1', { fields: [['value', IndexKind.ASCENDING]] })
    );
    await addDoc('coll1/doc1', { 'value': true });
    await addDoc('coll2/doc2/coll1/doc1', { 'value': true });
    await addDoc('coll2/doc2', { 'value': true });
    const q = queryWithAddedFilter(
      newQueryForCollectionGroup('coll1'),
      filter('value', '==', true)
    );
    await verifyResults(q, 'coll1/doc1', 'coll2/doc2/coll1/doc1');
  });

  it('applies limit filter', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['value', IndexKind.ASCENDING]] })
    );
    await addDoc('coll/doc1', { 'value': 1 });
    await addDoc('coll/doc2', { 'value': 1 });
    await addDoc('coll/doc3', { 'value': 1 });
    const q = queryWithLimit(
      queryWithAddedFilter(query('coll'), filter('value', '==', 1)),
      2,
      LimitType.First
    );
    await verifyResults(q, 'coll/doc1', 'coll/doc2');
  });

  it('uses ordering for limit filter', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['value', IndexKind.CONTAINS],
          ['value', IndexKind.ASCENDING]
        ]
      })
    );
    await addDoc('coll/doc1', { 'value': [1, 'foo'] });
    await addDoc('coll/doc2', { 'value': [3, 'foo'] });
    await addDoc('coll/doc3', { 'value': [2, 'foo'] });
    const q = queryWithLimit(
      queryWithAddedOrderBy(
        queryWithAddedFilter(
          query('coll'),
          filter('value', 'array-contains', 'foo')
        ),
        orderBy('value')
      ),
      2,
      LimitType.First
    );
    await verifyResults(q, 'coll/doc1', 'coll/doc3');
  });

  it('updates index entries', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['value', IndexKind.ASCENDING]] })
    );
    const q = queryWithAddedOrderBy(query('coll'), orderBy('value'));

    await addDoc('coll/doc1', { 'value': true });
    await verifyResults(q, 'coll/doc1');

    await addDocs(
      doc('coll/doc1', 1, {}),
      doc('coll/doc2', 1, { 'value': true })
    );
    await verifyResults(q, 'coll/doc2');
  });

  it('removes index entries', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['value', IndexKind.ASCENDING]] })
    );
    const q = queryWithAddedOrderBy(query('coll'), orderBy('value'));

    await addDoc('coll/doc1', { 'value': true });
    await verifyResults(q, 'coll/doc1');

    await addDocs(deletedDoc('coll/doc1', 1));
    await verifyResults(q);
  });

  it('supports order by key', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['count', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['count', IndexKind.DESCENDING]] })
    );
    await addDoc('coll/val1a', { 'count': 1 });
    await addDoc('coll/val1b', { 'count': 1 });
    await addDoc('coll/val2', { 'count': 2 });

    let q = queryWithAddedOrderBy(query('coll'), orderBy('count'));
    await verifyResults(q, 'coll/val1a', 'coll/val1b', 'coll/val2');

    q = queryWithAddedOrderBy(query('coll'), orderBy('count', 'desc'));
    await verifyResults(q, 'coll/val2', 'coll/val1b', 'coll/val1a');
  });

  it('supports order by filter', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['count', IndexKind.ASCENDING]] })
    );

    await addDoc('coll/val1a', { 'count': 1 });
    await addDoc('coll/val1b', { 'count': 1 });
    await addDoc('coll/val2', { 'count': 2 });

    const q = queryWithAddedOrderBy(query('coll'), orderBy('count'));
    await verifyResults(q, 'coll/val1a', 'coll/val1b', 'coll/val2');
  });

  it('supports ascending order with greater than filter', async () => {
    await setUpMultipleOrderBys();

    const originalQuery = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(
          queryWithAddedFilter(query('coll'), filter('a', '==', 2)),
          filter('b', '==', 2)
        ),
        filter('c', '<', 5)
      ),
      orderBy('c', 'asc')
    );
    const queryWithNonRestrictedBound = queryWithEndAt(
      queryWithStartAt(originalQuery, bound([1], /* inclusive= */ false)),
      bound([6], /* inclusive= */ false)
    );
    const queryWithRestrictedBound = queryWithEndAt(
      queryWithStartAt(originalQuery, bound([2], /* inclusive= */ false)),
      bound([4], /* inclusive= */ false)
    );

    await verifyResults(originalQuery, 'coll/val2', 'coll/val3', 'coll/val4');
    await verifyResults(
      queryWithNonRestrictedBound,
      'coll/val2',
      'coll/val3',
      'coll/val4'
    );
    await verifyResults(queryWithRestrictedBound, 'coll/val3');
  });

  it('supports descending order with less than filter', async () => {
    await setUpMultipleOrderBys();

    const originalQuery = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(
          queryWithAddedFilter(query('coll'), filter('a', '==', 2)),
          filter('b', '==', 2)
        ),
        filter('c', '<', 5)
      ),
      orderBy('c', 'desc')
    );
    const queryWithNonRestrictedBound = queryWithEndAt(
      queryWithStartAt(originalQuery, bound([6], /* inclusive= */ false)),
      bound([1], /* inclusive= */ false)
    );
    const queryWithRestrictedBound = queryWithEndAt(
      queryWithStartAt(originalQuery, bound([4], /* inclusive= */ false)),
      bound([2], /* inclusive= */ false)
    );

    await verifyResults(originalQuery, 'coll/val4', 'coll/val3', 'coll/val2');
    await verifyResults(
      queryWithNonRestrictedBound,
      'coll/val4',
      'coll/val3',
      'coll/val2'
    );
    await verifyResults(queryWithRestrictedBound, 'coll/val3');
  });

  it('supports ascending order with greater than filter', async () => {
    await setUpMultipleOrderBys();

    const originalQuery = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(
          queryWithAddedFilter(query('coll'), filter('a', '==', 2)),
          filter('b', '==', 2)
        ),
        filter('c', '>', 2)
      ),
      orderBy('c', 'asc')
    );
    const queryWithNonRestrictedBound = queryWithEndAt(
      queryWithStartAt(originalQuery, bound([2], /* inclusive= */ false)),
      bound([6], /* inclusive= */ false)
    );
    const queryWithRestrictedBound = queryWithEndAt(
      queryWithStartAt(originalQuery, bound([3], /* inclusive= */ false)),
      bound([5], /* inclusive= */ false)
    );

    await verifyResults(originalQuery, 'coll/val3', 'coll/val4', 'coll/val5');
    await verifyResults(
      queryWithNonRestrictedBound,
      'coll/val3',
      'coll/val4',
      'coll/val5'
    );
    await verifyResults(queryWithRestrictedBound, 'coll/val4');
  });

  it('supports descending order with greater than filter', async () => {
    await setUpMultipleOrderBys();

    const originalQuery = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(
          queryWithAddedFilter(query('coll'), filter('a', '==', 2)),
          filter('b', '==', 2)
        ),
        filter('c', '>', 2)
      ),
      orderBy('c', 'desc')
    );
    const queryWithNonRestrictedBound = queryWithEndAt(
      queryWithStartAt(originalQuery, bound([6], /* inclusive= */ false)),
      bound([2], /* inclusive= */ false)
    );
    const queryWithRestrictedBound = queryWithEndAt(
      queryWithStartAt(originalQuery, bound([5], /* inclusive= */ false)),
      bound([3], /* inclusive= */ false)
    );

    await verifyResults(originalQuery, 'coll/val5', 'coll/val4', 'coll/val3');
    await verifyResults(
      queryWithNonRestrictedBound,
      'coll/val5',
      'coll/val4',
      'coll/val3'
    );
    await verifyResults(queryWithRestrictedBound, 'coll/val4');
  });

  it('cannot expand result set from a cursor', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['c', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['c', IndexKind.DESCENDING]] })
    );
    await addDoc('coll/val1', { 'a': 1, 'b': 1, 'c': 3 });
    await addDoc('coll/val2', { 'a': 2, 'b': 2, 'c': 2 });

    let testingQuery = queryWithStartAt(
      queryWithAddedOrderBy(
        queryWithAddedFilter(query('coll'), filter('c', '>', 2)),
        orderBy('c', 'asc')
      ),
      bound([2], /* inclusive= */ true)
    );
    await verifyResults(testingQuery, 'coll/val1');

    testingQuery = queryWithStartAt(
      queryWithAddedOrderBy(
        queryWithAddedFilter(query('coll'), filter('c', '<', 3)),
        orderBy('c', 'desc')
      ),
      bound([3], /* inclusive= */ true)
    );
    await verifyResults(testingQuery, 'coll/val2');
  });

  it('can have filters on the same field', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['a', IndexKind.ASCENDING],
          ['b', IndexKind.ASCENDING]
        ]
      })
    );
    await addDoc('coll/val1', { 'a': 1, 'b': 1 });
    await addDoc('coll/val2', { 'a': 2, 'b': 2 });
    await addDoc('coll/val3', { 'a': 3, 'b': 3 });
    await addDoc('coll/val4', { 'a': 4, 'b': 4 });

    let testingQuery = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('a', '>', 1)),
      filter('a', '==', 2)
    );
    await verifyResults(testingQuery, 'coll/val2');

    testingQuery = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('a', '<=', 1)),
      filter('a', '==', 2)
    );
    await verifyResults(testingQuery);

    testingQuery = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(query('coll'), filter('a', '>', 1)),
        filter('a', '==', 2)
      ),
      orderBy('a')
    );
    await verifyResults(testingQuery, 'coll/val2');

    testingQuery = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedFilter(
          queryWithAddedFilter(query('coll'), filter('a', '>', 1)),
          filter('a', '==', 2)
        ),
        orderBy('a')
      ),
      orderBy('__name__', 'desc')
    );
    await verifyResults(testingQuery, 'coll/val2');

    testingQuery = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedFilter(
          queryWithAddedFilter(query('coll'), filter('a', '>', 1)),
          filter('a', '==', 3)
        ),
        orderBy('a')
      ),
      orderBy('b', 'desc')
    );
    await verifyResults(testingQuery, 'coll/val3');
  });

  it('support advances queries', async () => {
    // This test compares local query results with those received from the Java
    // Server SDK.

    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['null', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['int', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['float', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['string', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['multi', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['array', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['array', IndexKind.DESCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['array', IndexKind.CONTAINS]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['map', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['map.field', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['prefix', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['prefix', IndexKind.ASCENDING],
          ['suffix', IndexKind.ASCENDING]
        ]
      })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['a', IndexKind.ASCENDING],
          ['b', IndexKind.ASCENDING]
        ]
      })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['a', IndexKind.DESCENDING],
          ['b', IndexKind.ASCENDING]
        ]
      })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['a', IndexKind.ASCENDING],
          ['b', IndexKind.DESCENDING]
        ]
      })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['a', IndexKind.DESCENDING],
          ['b', IndexKind.DESCENDING]
        ]
      })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['b', IndexKind.ASCENDING],
          ['a', IndexKind.ASCENDING]
        ]
      })
    );

    const docs = [
      {},
      { 'int': 1, 'array': [1, 'foo'] },
      { 'array': [2, 'foo'] },
      { 'int': 3, 'array': [3, 'foo'] },
      { 'array': 'foo' },
      { 'array': [1] },
      { 'float': -0.0, 'string': 'a' },
      { 'float': 0, 'string': 'ab' },
      { 'float': 0.0, 'string': 'b' },
      { 'float': NaN },
      { 'multi': true },
      { 'multi': 1 },
      { 'multi': 'string' },
      { 'multi': [] },
      { 'null': null },
      { 'prefix': [1, 2], 'suffix': null },
      { 'prefix': [1], 'suffix': 2 },
      { 'map': {} },
      { 'map': { 'field': true } },
      { 'map': { 'field': false } },
      { 'a': 0, 'b': 0 },
      { 'a': 0, 'b': 1 },
      { 'a': 1, 'b': 0 },
      { 'a': 1, 'b': 1 },
      { 'a': 2, 'b': 0 },
      { 'a': 2, 'b': 1 }
    ];

    for (const doc of docs) {
      await addDoc('coll/' + canonicalId(wrap(doc)), doc);
    }

    const q = query('coll');

    await verifyResults(
      queryWithAddedOrderBy(q, orderBy('int')),
      'coll/{array:[1,foo],int:1}',
      'coll/{array:[3,foo],int:3}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('float', '==', NaN)),
      'coll/{float:NaN}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('float', '==', -0.0)),
      'coll/{float:-0,string:a}',
      'coll/{float:0,string:ab}',
      'coll/{float:0,string:b}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('float', '==', 0)),
      'coll/{float:-0,string:a}',
      'coll/{float:0,string:ab}',
      'coll/{float:0,string:b}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('float', '==', 0.0)),
      'coll/{float:-0,string:a}',
      'coll/{float:0,string:ab}',
      'coll/{float:0,string:b}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('string', '==', 'a')),
      'coll/{float:-0,string:a}'
    );

    await verifyResults(
      queryWithAddedFilter(q, filter('string', '>', 'a')),
      'coll/{float:0,string:ab}',
      'coll/{float:0,string:b}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('string', '>=', 'a')),
      'coll/{float:-0,string:a}',
      'coll/{float:0,string:ab}',
      'coll/{float:0,string:b}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('string', '<', 'b')),
      'coll/{float:-0,string:a}',
      'coll/{float:0,string:ab}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('string', '<', 'coll')),
      'coll/{float:-0,string:a}',
      'coll/{float:0,string:ab}',
      'coll/{float:0,string:b}'
    );
    await verifyResults(
      queryWithAddedFilter(
        queryWithAddedFilter(q, filter('string', '>', 'a')),
        filter('string', '<', 'b')
      ),
      'coll/{float:0,string:ab}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('array', 'array-contains', 'foo')),
      'coll/{array:[1,foo],int:1}',
      'coll/{array:[2,foo]}',
      'coll/{array:[3,foo],int:3}'
    );
    await verifyResults(
      queryWithAddedFilter(
        q,
        filter('array', 'array-contains-any', [1, 'foo'])
      ),
      'coll/{array:[1,foo],int:1}',
      'coll/{array:[1]}',
      'coll/{array:[2,foo]}',
      'coll/{array:[3,foo],int:3}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('multi', '>=', true)),
      'coll/{multi:true}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('multi', '>=', 0)),
      'coll/{multi:1}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('multi', '>=', '')),
      'coll/{multi:string}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('multi', '>=', [])),
      'coll/{multi:[]}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('multi', '!=', true)),
      'coll/{multi:1}',
      'coll/{multi:string}',
      'coll/{multi:[]}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('multi', 'in', [true, 1])),
      'coll/{multi:true}',
      'coll/{multi:1}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('multi', 'not-in', [true, 1])),
      'coll/{multi:string}',
      'coll/{multi:[]}'
    );
    await verifyResults(
      queryWithStartAt(
        queryWithAddedOrderBy(q, orderBy('array')),
        bound([[2]], true)
      ),
      'coll/{array:[2,foo]}',
      'coll/{array:[3,foo],int:3}'
    );
    await verifyResults(
      queryWithStartAt(
        queryWithAddedOrderBy(q, orderBy('array', 'desc')),
        bound([[2]], true)
      ),
      'coll/{array:[1,foo],int:1}',
      'coll/{array:[1]}',
      'coll/{array:foo}'
    );
    await verifyResults(
      queryWithLimit(
        queryWithStartAt(
          queryWithAddedOrderBy(q, orderBy('array', 'desc')),
          bound([[2]], true)
        ),
        2,
        LimitType.First
      ),
      'coll/{array:[1,foo],int:1}',
      'coll/{array:[1]}'
    );
    await verifyResults(
      queryWithStartAt(
        queryWithAddedOrderBy(q, orderBy('array')),
        bound([[2]], false)
      ),
      'coll/{array:[2,foo]}',
      'coll/{array:[3,foo],int:3}'
    );
    await verifyResults(
      queryWithStartAt(
        queryWithAddedOrderBy(q, orderBy('array', 'desc')),
        bound([[2]], false)
      ),
      'coll/{array:[1,foo],int:1}',
      'coll/{array:[1]}',
      'coll/{array:foo}'
    );
    await verifyResults(
      queryWithLimit(
        queryWithStartAt(
          queryWithAddedOrderBy(q, orderBy('array', 'desc')),
          bound([[2]], true)
        ),
        2,
        LimitType.First
      ),
      'coll/{array:[1,foo],int:1}',
      'coll/{array:[1]}'
    );
    await verifyResults(
      queryWithStartAt(
        queryWithAddedOrderBy(q, orderBy('array')),
        bound([[2, 'foo']], false)
      ),
      'coll/{array:[3,foo],int:3}'
    );
    await verifyResults(
      queryWithStartAt(
        queryWithAddedOrderBy(q, orderBy('array', 'desc')),
        bound([[2, 'foo']], false)
      ),
      'coll/{array:[1,foo],int:1}',
      'coll/{array:[1]}',
      'coll/{array:foo}'
    );
    await verifyResults(
      queryWithLimit(
        queryWithStartAt(
          queryWithAddedOrderBy(q, orderBy('array', 'desc')),
          bound([[2, 'foo']], false)
        ),
        2,
        LimitType.First
      ),
      'coll/{array:[1,foo],int:1}',
      'coll/{array:[1]}'
    );
    await verifyResults(
      queryWithEndAt(
        queryWithAddedOrderBy(q, orderBy('array')),
        bound([[2]], true)
      ),
      'coll/{array:foo}',
      'coll/{array:[1]}',
      'coll/{array:[1,foo],int:1}'
    );
    await verifyResults(
      queryWithEndAt(
        queryWithAddedOrderBy(q, orderBy('array', 'desc')),
        bound([[2]], true)
      ),
      'coll/{array:[3,foo],int:3}',
      'coll/{array:[2,foo]}'
    );
    await verifyResults(
      queryWithEndAt(
        queryWithAddedOrderBy(q, orderBy('array')),
        bound([[2]], false)
      ),
      'coll/{array:foo}',
      'coll/{array:[1]}',
      'coll/{array:[1,foo],int:1}'
    );
    await verifyResults(
      queryWithLimit(
        queryWithEndAt(
          queryWithAddedOrderBy(q, orderBy('array')),
          bound([[2]], false)
        ),
        2,
        LimitType.First
      ),
      'coll/{array:foo}',
      'coll/{array:[1]}'
    );

    await verifyResults(
      queryWithEndAt(
        queryWithAddedOrderBy(q, orderBy('array', 'desc')),
        bound([[2]], false)
      ),
      'coll/{array:[3,foo],int:3}',
      'coll/{array:[2,foo]}'
    );
    await verifyResults(
      queryWithEndAt(
        queryWithAddedOrderBy(q, orderBy('array')),
        bound([[2, 'foo']], false)
      ),
      'coll/{array:foo}',
      'coll/{array:[1]}',
      'coll/{array:[1,foo],int:1}'
    );
    await verifyResults(
      queryWithLimit(
        queryWithEndAt(
          queryWithAddedOrderBy(q, orderBy('array')),
          bound([[2, 'foo']], false)
        ),
        2,
        LimitType.First
      ),
      'coll/{array:foo}',
      'coll/{array:[1]}'
    );
    await verifyResults(
      queryWithEndAt(
        queryWithAddedOrderBy(q, orderBy('array', 'desc')),
        bound([[2, 'foo']], false)
      ),
      'coll/{array:[3,foo],int:3}'
    );
    await verifyResults(
      queryWithLimit(
        queryWithAddedOrderBy(
          queryWithAddedOrderBy(q, orderBy('a')),
          orderBy('b')
        ),
        1,
        LimitType.First
      ),
      'coll/{a:0,b:0}'
    );

    await verifyResults(
      queryWithLimit(
        queryWithAddedOrderBy(
          queryWithAddedOrderBy(q, orderBy('a', 'desc')),
          orderBy('b')
        ),
        1,
        LimitType.First
      ),
      'coll/{a:2,b:0}'
    );
    await verifyResults(
      queryWithLimit(
        queryWithAddedOrderBy(
          queryWithAddedOrderBy(q, orderBy('a')),
          orderBy('b', 'desc')
        ),
        1,
        LimitType.First
      ),
      'coll/{a:0,b:1}'
    );
    await verifyResults(
      queryWithLimit(
        queryWithAddedOrderBy(
          queryWithAddedOrderBy(q, orderBy('a', 'desc')),
          orderBy('b', 'desc')
        ),
        1,
        LimitType.First
      ),
      'coll/{a:2,b:1}'
    );
    await verifyResults(
      queryWithAddedFilter(
        queryWithAddedFilter(q, filter('a', '>', 0)),
        filter('b', '==', 1)
      ),
      'coll/{a:1,b:1}',
      'coll/{a:2,b:1}'
    );
    await verifyResults(
      queryWithAddedFilter(
        queryWithAddedFilter(q, filter('a', '==', 1)),
        filter('b', '==', 1)
      ),
      'coll/{a:1,b:1}'
    );
    await verifyResults(
      queryWithAddedFilter(
        queryWithAddedFilter(q, filter('a', '!=', 0)),
        filter('b', '==', 1)
      ),
      'coll/{a:1,b:1}',
      'coll/{a:2,b:1}'
    );
    await verifyResults(
      queryWithAddedFilter(
        queryWithAddedFilter(q, filter('b', '==', 1)),
        filter('a', '!=', 0)
      ),
      'coll/{a:1,b:1}',
      'coll/{a:2,b:1}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('a', 'not-in', [0, 1])),
      'coll/{a:2,b:0}',
      'coll/{a:2,b:1}'
    );
    await verifyResults(
      queryWithAddedFilter(
        queryWithAddedFilter(q, filter('a', 'not-in', [0, 1])),
        filter('b', '==', 1)
      ),
      'coll/{a:2,b:1}'
    );
    await verifyResults(
      queryWithAddedFilter(
        queryWithAddedFilter(q, filter('b', '==', 1)),
        filter('a', 'not-in', [0, 1])
      ),
      'coll/{a:2,b:1}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('null', '==', null)),
      'coll/{null:null}'
    );
    await verifyResults(
      queryWithAddedOrderBy(q, orderBy('null')),
      'coll/{null:null}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('prefix', '==', [1, 2])),
      'coll/{prefix:[1,2],suffix:null}'
    );
    await verifyResults(
      queryWithAddedFilter(
        queryWithAddedFilter(q, filter('prefix', '==', [1])),
        filter('suffix', '==', 2)
      ),
      'coll/{prefix:[1],suffix:2}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('map', '==', {})),
      'coll/{map:{}}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('map', '==', { 'field': true })),
      'coll/{map:{field:true}}'
    );
    await verifyResults(
      queryWithAddedFilter(q, filter('map.field', '==', true)),
      'coll/{map:{field:true}}'
    );
    await verifyResults(
      queryWithAddedOrderBy(q, orderBy('map')),
      'coll/{map:{}}',
      'coll/{map:{field:false}}',
      'coll/{map:{field:true}}'
    );
    await verifyResults(
      queryWithAddedOrderBy(q, orderBy('map.field')),
      'coll/{map:{field:false}}',
      'coll/{map:{field:true}}'
    );
  });

  it('serves partial and full index', async () => {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['a', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['b', IndexKind.ASCENDING]] })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['c', IndexKind.ASCENDING],
          ['d', IndexKind.ASCENDING]
        ]
      })
    );

    const query1 = queryWithAddedFilter(query('coll'), filter('a', '==', 1));
    await validateIsFullIndex(query1);

    const query2 = queryWithAddedFilter(query('coll'), filter('b', '==', 1));
    await validateIsFullIndex(query2);

    const query3 = queryWithAddedOrderBy(
      queryWithAddedFilter(query('coll'), filter('a', '==', 1)),
      orderBy('a')
    );
    await validateIsFullIndex(query3);

    const query4 = queryWithAddedOrderBy(
      queryWithAddedFilter(query('coll'), filter('b', '==', 1)),
      orderBy('b')
    );
    await validateIsFullIndex(query4);

    const query5 = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('a', '==', 1)),
      filter('b', '==', 1)
    );
    await validateIsPartialIndex(query5);

    const query6 = queryWithAddedOrderBy(
      queryWithAddedFilter(query('coll'), filter('a', '==', 1)),
      orderBy('b')
    );
    await validateIsPartialIndex(query6);

    const query7 = queryWithAddedOrderBy(
      queryWithAddedFilter(query('coll'), filter('b', '==', 1)),
      orderBy('a')
    );
    await validateIsPartialIndex(query7);

    const query8 = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('c', '==', 1)),
      filter('d', '==', 1)
    );
    await validateIsFullIndex(query8);

    const query9 = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(query('coll'), filter('c', '==', 1)),
        filter('d', '==', 1)
      ),
      orderBy('c')
    );
    await validateIsFullIndex(query9);

    const query10 = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(query('coll'), filter('c', '==', 1)),
        filter('d', '==', 1)
      ),
      orderBy('d')
    );
    await validateIsFullIndex(query10);

    const query11 = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedFilter(
          queryWithAddedFilter(query('coll'), filter('c', '==', 1)),
          filter('d', '==', 1)
        ),
        orderBy('c')
      ),
      orderBy('d')
    );
    await validateIsFullIndex(query11);

    const query12 = queryWithAddedOrderBy(
      queryWithAddedOrderBy(
        queryWithAddedFilter(
          queryWithAddedFilter(query('coll'), filter('c', '==', 1)),
          filter('d', '==', 1)
        ),
        orderBy('d')
      ),
      orderBy('c')
    );
    await validateIsFullIndex(query12);

    const query13 = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(query('coll'), filter('c', '==', 1)),
        filter('d', '==', 1)
      ),
      orderBy('e')
    );
    await validateIsPartialIndex(query13);

    const query14 = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('c', '==', 1)),
      filter('d', '<=', 1)
    );
    await validateIsFullIndex(query14);

    const query15 = queryWithAddedOrderBy(
      queryWithAddedFilter(
        queryWithAddedFilter(query('coll'), filter('c', '==', 1)),
        filter('d', '>', 1)
      ),
      orderBy('d')
    );
    await validateIsFullIndex(query15);
  });

  it('createTargetIndexes() creates full indexes for each sub-target', async () => {
    const query_ = queryWithAddedFilter(
      query('coll'),
      orFilter(filter('a', '==', 1), filter('b', '==', 2), filter('c', '==', 3))
    );
    const subQuery1 = queryWithAddedFilter(query('coll'), filter('a', '==', 1));
    const subQuery2 = queryWithAddedFilter(query('coll'), filter('b', '==', 2));
    const subQuery3 = queryWithAddedFilter(query('coll'), filter('c', '==', 3));
    await validateIsNoneIndex(query_);
    await validateIsNoneIndex(subQuery1);
    await validateIsNoneIndex(subQuery2);
    await validateIsNoneIndex(subQuery3);

    await indexManager.createTargetIndexes(queryToTarget(query_));

    await validateIsFullIndex(query_);
    await validateIsFullIndex(subQuery1);
    await validateIsFullIndex(subQuery2);
    await validateIsFullIndex(subQuery3);
  });

  it('createTargetIndexes() upgrades a partial index to a full index', async () => {
    const query_ = queryWithAddedFilter(
      queryWithAddedFilter(query('coll'), filter('a', '==', 1)),
      filter('b', '==', 2)
    );
    const subQuery1 = queryWithAddedFilter(query('coll'), filter('a', '==', 1));
    const subQuery2 = queryWithAddedFilter(query('coll'), filter('b', '==', 2));
    await indexManager.createTargetIndexes(queryToTarget(subQuery1));
    await validateIsPartialIndex(query_);
    await validateIsFullIndex(subQuery1);
    await validateIsNoneIndex(subQuery2);

    await indexManager.createTargetIndexes(queryToTarget(query_));

    await validateIsFullIndex(query_);
    await validateIsFullIndex(subQuery1);
    await validateIsNoneIndex(subQuery2);
  });

  it('createTargetIndexes() does nothing if a full index already exists', async () => {
    const query_ = query('coll');
    await indexManager.createTargetIndexes(queryToTarget(query_));
    await validateIsFullIndex(query_);

    await indexManager.createTargetIndexes(queryToTarget(query_));

    await validateIsFullIndex(query_);
  });

  it('deleteAllFieldIndexes() deletes all indexes', async () => {
    // Create some indexes.
    const query1 = queryWithAddedFilter(query('coll'), filter('a', '==', 42));
    await indexManager.createTargetIndexes(queryToTarget(query1));
    await validateIsFullIndex(query1);
    const query2 = queryWithAddedFilter(query('coll'), filter('b', '==', 42));
    await indexManager.createTargetIndexes(queryToTarget(query2));
    await validateIsFullIndex(query2);

    // Verify that deleteAllFieldIndexes() deletes the indexes.
    await indexManager.deleteAllFieldIndexes();
    await validateIsNoneIndex(query1);
    await validateIsNoneIndex(query2);
  });

  it('fieldIndexPlugin is initially null', async () => {
    const indexManager = await getIndexedDbIndexManager();
    expect(indexManager.fieldIndexPlugin).is.null;
  });

  it('installFieldIndexPlugin() specifies the correct arguments to the factory', async () => {
    const indexManager = await getIndexedDbIndexManager(new User('abc'));
    const factory = new TestIndexedDbIndexManagerFieldIndexPluginFactory();
    indexManager.installFieldIndexPlugin(factory);
    const invocation = factory.invocations[0];
    expect(invocation.uid).to.equal('abc');
    expect(invocation.databaseId.isEqual(TEST_DATABASE_ID)).to.be.true;
  });

  it('installFieldIndexPlugin() initializes fieldIndexPlugin on first invocation', async () => {
    const indexManager = await getIndexedDbIndexManager();
    const factory = new TestIndexedDbIndexManagerFieldIndexPluginFactory([
      'foo'
    ]);
    indexManager.installFieldIndexPlugin(factory);
    expect(indexManager.fieldIndexPlugin).to.equal('foo');
  });

  it('installFieldIndexPlugin() does not modify fieldIndexPlugin on subsequent invocations', async () => {
    const indexManager = await getIndexedDbIndexManager();
    const factory = new TestIndexedDbIndexManagerFieldIndexPluginFactory([
      'foo',
      'bar'
    ]);
    indexManager.installFieldIndexPlugin(factory);
    indexManager.installFieldIndexPlugin(factory);
    expect(indexManager.fieldIndexPlugin).to.equal('foo');
  });

  it('installFieldIndexPlugin() returns the object that was created by the factory', async () => {
    const indexManager = await getIndexedDbIndexManager();
    const factory = new TestIndexedDbIndexManagerFieldIndexPluginFactory([
      'foo'
    ]);
    expect(indexManager.installFieldIndexPlugin(factory)).to.equal('foo');
  });

  it('installFieldIndexPlugin() returns the object that was created by the first invocation', async () => {
    const indexManager = await getIndexedDbIndexManager();
    const factory = new TestIndexedDbIndexManagerFieldIndexPluginFactory([
      'foo',
      'bar'
    ]);
    indexManager.installFieldIndexPlugin(factory);
    expect(indexManager.installFieldIndexPlugin(factory)).to.equal('bar');
  });

  it('installFieldIndexPlugin() throws if invoked with a different factory', async () => {
    const indexManager = await getIndexedDbIndexManager();
    const factory1 = new TestIndexedDbIndexManagerFieldIndexPluginFactory([
      'foo'
    ]);
    const factory2 = new TestIndexedDbIndexManagerFieldIndexPluginFactory([
      'bar'
    ]);
    indexManager.installFieldIndexPlugin(factory1);
    expect(() => indexManager.installFieldIndexPlugin(factory2)).to.throw(
      'factory object'
    );
  });

  async function validateIsPartialIndex(query: Query): Promise<void> {
    await validateIndexType(query, IndexType.PARTIAL);
  }

  async function validateIsFullIndex(query: Query): Promise<void> {
    await validateIndexType(query, IndexType.FULL);
  }

  async function validateIsNoneIndex(query: Query): Promise<void> {
    await validateIndexType(query, IndexType.NONE);
  }

  async function validateIndexType(
    query: Query,
    expectedIndexType: IndexType
  ): Promise<void> {
    const indexType = await indexManager.getIndexType(queryToTarget(query));
    expect(
      indexType,
      'index type is ' +
        displayNameForIndexType(indexType) +
        ' but expected ' +
        displayNameForIndexType(expectedIndexType)
    ).to.equal(expectedIndexType);
  }

  async function setUpSingleValueFilter(): Promise<void> {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['count', IndexKind.ASCENDING]] })
    );
    await addDoc('coll/val1', { 'count': 1 });
    await addDoc('coll/val2', { 'count': 2 });
    await addDoc('coll/val3', { 'count': 3 });
  }

  async function setUpArrayValueFilter(): Promise<void> {
    await indexManager.addFieldIndex(
      fieldIndex('coll', { fields: [['values', IndexKind.CONTAINS]] })
    );
    await addDoc('coll/arr1', { 'values': [1, 2, 3] });
    await addDoc('coll/arr2', { 'values': [4, 5, 6] });
    await addDoc('coll/arr3', { 'values': [7, 8, 9] });
  }

  async function setUpMultipleOrderBys(): Promise<void> {
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['a', IndexKind.ASCENDING],
          ['b', IndexKind.DESCENDING],
          ['c', IndexKind.ASCENDING]
        ]
      })
    );
    await indexManager.addFieldIndex(
      fieldIndex('coll', {
        fields: [
          ['a', IndexKind.DESCENDING],
          ['b', IndexKind.ASCENDING],
          ['c', IndexKind.DESCENDING]
        ]
      })
    );
    await addDoc('coll/val1', { 'a': 1, 'b': 1, 'c': 3 });
    await addDoc('coll/val2', { 'a': 2, 'b': 2, 'c': 2 });
    await addDoc('coll/val3', { 'a': 2, 'b': 2, 'c': 3 });
    await addDoc('coll/val4', { 'a': 2, 'b': 2, 'c': 4 });
    await addDoc('coll/val5', { 'a': 2, 'b': 2, 'c': 5 });
    await addDoc('coll/val6', { 'a': 3, 'b': 3, 'c': 6 });
  }

  function addDocs(...docs: Document[]): Promise<void> {
    return indexManager.updateIndexEntries(documentMap(...docs));
  }

  function addDoc(key: string, data: JsonObject<unknown>): Promise<void> {
    return addDocs(doc(key, 1, data));
  }

  async function verifyResults(query: Query, ...keys: string[]): Promise<void> {
    const target = queryToTarget(query);
    const actualResults = await indexManager.getDocumentsMatchingTarget(target);
    expect(actualResults).to.not.equal(null, 'Expected successful query');
    const actualKeys: string[] = [];
    actualResults!.forEach(v => actualKeys.push(v.path.toString()));
    expect(actualKeys).to.have.ordered.members(keys);
  }
});

/**
 * Defines the set of tests to run against both IndexManager implementations.
 */
function genericIndexManagerTests(
  persistencePromise: () => Promise<Persistence>
): void {
  addEqualityMatcher();
  let indexManager: TestIndexManager;

  let persistence: Persistence;
  beforeEach(async () => {
    persistence = await persistencePromise();
    indexManager = new TestIndexManager(
      persistence,
      persistence.getIndexManager(User.UNAUTHENTICATED)
    );
  });

  afterEach(async () => {
    if (persistence.started) {
      await persistence.shutdown();
      await persistenceHelpers.clearTestPersistence();
    }
  });

  it('can add and read collection=>parent index entries', async () => {
    await indexManager.addToCollectionParentIndex(path('messages'));
    await indexManager.addToCollectionParentIndex(path('messages'));
    await indexManager.addToCollectionParentIndex(path('rooms/foo/messages'));
    await indexManager.addToCollectionParentIndex(path('rooms/bar/messages'));
    await indexManager.addToCollectionParentIndex(path('rooms/foo/messages2'));

    expect(await indexManager.getCollectionParents('messages')).to.deep.equal([
      path(''),
      path('rooms/bar'),
      path('rooms/foo')
    ]);
    expect(await indexManager.getCollectionParents('messages2')).to.deep.equal([
      path('rooms/foo')
    ]);
    expect(await indexManager.getCollectionParents('messages3')).to.deep.equal(
      []
    );
  });
}

class TestIndexedDbIndexManagerFieldIndexPluginFactory
  implements IndexedDbIndexManagerFieldIndexPluginFactory
{
  private readonly returnValuesIterator: Iterator<unknown>;

  private readonly _invocations: TestIndexedDbIndexManagerFieldIndexPluginFactoryInvocation[] =
    [];

  get invocations(): TestIndexedDbIndexManagerFieldIndexPluginFactoryInvocation[] {
    return Array.from(this._invocations);
  }

  constructor(returnValues: unknown[] = []) {
    this.returnValuesIterator = returnValues[Symbol.iterator]();
  }

  newIndexedDbIndexManagerFieldIndexPlugin(
    uid: string,
    databaseId: DatabaseId
  ): IndexedDbIndexManagerFieldIndexPlugin {
    this._invocations.push({ uid, databaseId });
    return this.returnValuesIterator.next()
      .value as IndexedDbIndexManagerFieldIndexPlugin;
  }
}

interface TestIndexedDbIndexManagerFieldIndexPluginFactoryInvocation {
  uid: string;
  databaseId: DatabaseId;
}
