/**
 * Copyright 2018 Google Inc.
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
import { ResourcePath } from '../../../src/model/path';
import { SortedSet } from '../../../src/util/sorted_set';
import { addEqualityMatcher } from '../../util/equality_matcher';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestQueryIndexes } from './test_query_indexes';

describe('MemoryQueryIndexes', () => {
  genericQueryIndexesTests(persistenceHelpers.testMemoryEagerPersistence);
});

describe('IndexedDbQueryIndexes', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbQueryIndexes tests.');
    return;
  }

  let persistencePromise: Promise<Persistence>;
  beforeEach(async () => {
    persistencePromise = persistenceHelpers.testIndexedDbPersistence();
  });

  genericQueryIndexesTests(() => persistencePromise);
});

/**
 * Defines the set of tests to run against both QueryIndexes implementations.
 */
function genericQueryIndexesTests(
  persistencePromise: () => Promise<Persistence>
): void {
  addEqualityMatcher();
  let indexes: TestQueryIndexes;

  let persistence: Persistence;
  beforeEach(async () => {
    persistence = await persistencePromise();
    indexes = new TestQueryIndexes(persistence, persistence.getQueryIndexes());
  });

  afterEach(async () => {
    if (persistence.started) {
      await persistence.shutdown(/* deleteData= */ true);
    }
  });

  it('can add and read collection=>parent index entries', async () => {
    await indexes.indexCollectionParent(ResourcePath.fromString('messages'));
    await indexes.indexCollectionParent(ResourcePath.fromString('messages'));
    await indexes.indexCollectionParent(
      ResourcePath.fromString('rooms/foo/messages')
    );
    await indexes.indexCollectionParent(
      ResourcePath.fromString('rooms/bar/messages')
    );
    await indexes.indexCollectionParent(
      ResourcePath.fromString('rooms/foo/messages2')
    );

    expect(await indexes.getCollectionParents('messages')).to.deep.equal(
      pathSet('', 'rooms/foo', 'rooms/bar')
    );

    expect(await indexes.getCollectionParents('messages2')).to.deep.equal(
      pathSet('rooms/foo')
    );

    expect(await indexes.getCollectionParents('messages3')).to.deep.equal(
      pathSet()
    );
  });

  function pathSet(...pathStrings: string[]): SortedSet<ResourcePath> {
    let paths = new SortedSet<ResourcePath>(ResourcePath.comparator);
    for (const path of pathStrings) {
      paths = paths.add(ResourcePath.fromString(path));
    }
    return paths;
  }
}
