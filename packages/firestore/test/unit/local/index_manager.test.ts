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
import { addEqualityMatcher } from '../../util/equality_matcher';
import { doc, fieldIndex, key, path, version } from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestIndexManager } from './test_index_manager';

describe('MemoryIndexManager', () => {
  genericIndexManagerTests(persistenceHelpers.testMemoryEagerPersistence);
});

describe('IndexedDbIndexManager', () => {
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
