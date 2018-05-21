/**
 * Copyright 2017 Google Inc.
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
import { RemoteDocumentChangeBuffer } from '../../../src/local/remote_document_change_buffer';
import { deletedDoc, doc, expectEqual, key } from '../../util/helpers';

import { testIndexedDbPersistence } from './persistence_test_helpers';
import { TestRemoteDocumentCache } from './test_remote_document_cache';
import { TestRemoteDocumentChangeBuffer } from './test_remote_document_change_buffer';

let persistence: Persistence;
let cache: TestRemoteDocumentCache;
let buffer: TestRemoteDocumentChangeBuffer;
const INITIAL_DOC = doc('coll/a', 42, { test: 'data' });

describe('RemoteDocumentChangeBuffer', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping RemoteDocumentChangeBuffer tests.');
    return;
  }
  beforeEach(() => {
    return testIndexedDbPersistence().then(p => {
      persistence = p;
      cache = new TestRemoteDocumentCache(
        persistence,
        persistence.getRemoteDocumentCache()
      );
      buffer = new TestRemoteDocumentChangeBuffer(
        persistence,
        new RemoteDocumentChangeBuffer(cache.cache)
      );

      // Add a couple initial items to the cache.
      return cache.addEntries([INITIAL_DOC, deletedDoc('coll/b', 314)]);
    });
  });

  afterEach(() => persistence.shutdown(/* deleteData= */ true));

  it('can read unchanged entry', async () => {
    const maybeDoc = await buffer.getEntry(key('coll/a'));
    expectEqual(maybeDoc, INITIAL_DOC);
  });

  it('can add entry and read it back', async () => {
    const newADoc = doc('coll/a', 43, { new: 'data' });
    buffer.addEntry(newADoc);
    expectEqual(await buffer.getEntry(key('coll/a')), newADoc);
  });

  it('can apply changes', async () => {
    const newADoc = doc('coll/a', 43, { new: 'data' });
    buffer.addEntry(newADoc);
    expectEqual(await buffer.getEntry(key('coll/a')), newADoc);

    // Reading directly against the cache should still yield the old result.
    expectEqual(await cache.getEntry(key('coll/a')), INITIAL_DOC);

    await buffer.apply();
    // Reading against the cache should now yield the new result.
    expectEqual(await cache.getEntry(key('coll/a')), newADoc);
  });

  it('methods fail after apply.', async () => {
    await buffer.apply();

    expect(() => buffer.addEntry(INITIAL_DOC)).to.throw();

    let errors = 0;
    return buffer
      .getEntry(key('coll/a'))
      .catch(() => errors++)
      .then(() => buffer.apply())
      .catch(() => errors++)
      .then(() => expect(errors).to.equal(2));
  });
});
