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
import { FieldFilter } from '../../../src/core/target';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { INDEXING_SCHEMA_VERSION } from '../../../src/local/indexeddb_schema';
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
  path,
  query,
  version,
  wrap
} from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestIndexManager } from './test_index_manager';

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
    persistencePromise = persistenceHelpers.testIndexedDbPersistence({
      schemaVersion: INDEXING_SCHEMA_VERSION
    });
  });

  async function getIndexManager(
    user = User.UNAUTHENTICATED
  ): Promise<TestIndexManager> {
    const persistence = await persistencePromise;
    return new TestIndexManager(persistence, persistence.getIndexManager(user));
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
    expect(await indexManager.getFieldIndex(queryToTarget(q))).to.be.null;
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
      'coll/{array:[2,foo]}',
      'coll/{array:[3,foo],int:3}',
      'coll/{array:[1]}'
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
      'coll/{array:foo}',
      'coll/{array:[1]}'
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
      'coll/{array:foo}',
      'coll/{array:[1]}'
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
      'coll/{array:foo}',
      'coll/{array:[1]}'
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
      'coll/{array:[1,foo],int:1}',
      'coll/{array:foo}',
      'coll/{array:[1]}'
    );
    await verifyResults(
      queryWithEndAt(
        queryWithAddedOrderBy(q, orderBy('array', 'desc')),
        bound([[2]], true)
      ),
      'coll/{array:[2,foo]}',
      'coll/{array:[3,foo],int:3}'
    );
    await verifyResults(
      queryWithEndAt(
        queryWithAddedOrderBy(q, orderBy('array')),
        bound([[2]], false)
      ),
      'coll/{array:[1,foo],int:1}',
      'coll/{array:foo}',
      'coll/{array:[1]}'
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
      'coll/{array:[2,foo]}',
      'coll/{array:[3,foo],int:3}'
    );
    await verifyResults(
      queryWithEndAt(
        queryWithAddedOrderBy(q, orderBy('array')),
        bound([[2, 'foo']], false)
      ),
      'coll/{array:[1,foo],int:1}',
      'coll/{array:foo}',
      'coll/{array:[1]}'
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
      'coll/{map:{field:true}}',
      'coll/{map:{field:false}}'
    );
    await verifyResults(
      queryWithAddedOrderBy(q, orderBy('map.field')),
      'coll/{map:{field:true}}',
      'coll/{map:{field:false}}'
    );
  });

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

  function addDocs(...docs: Document[]): Promise<void> {
    let data = documentMap();
    for (const doc of docs) {
      data = data.insert(doc.key, doc);
    }
    return indexManager.updateIndexEntries(data);
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
    expect(actualKeys).to.have.members(keys);
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
