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

import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { Persistence } from '../../../src/local/persistence';
import { addEqualityMatcher } from '../../util/equality_matcher';
import { path } from '../../util/helpers';

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
    persistencePromise = persistenceHelpers.testIndexedDbPersistence();
  });

  genericIndexManagerTests(() => persistencePromise);
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
      persistence.getIndexManager()
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
