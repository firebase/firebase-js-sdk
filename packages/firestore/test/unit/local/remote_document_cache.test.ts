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
import { Query } from '../../../src/core/query';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { Persistence } from '../../../src/local/persistence';
import { MaybeDocument } from '../../../src/model/document';
import {
  deletedDoc,
  doc,
  expectEqual,
  key,
  path,
  removedDoc
} from '../../util/helpers';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestRemoteDocumentCache } from './test_remote_document_cache';
import { MaybeDocumentMap } from '../../../src/model/collections';
import { IndexedDbRemoteDocumentCache } from '../../../src/local/indexeddb_remote_document_cache';
import {
  DbRemoteDocumentChangesKey,
  DbRemoteDocumentChanges
} from '../../../src/local/indexeddb_schema';

// Helpers for use throughout tests.
const DOC_PATH = 'a/b';
const LONG_DOC_PATH = 'a/b/c/d/e/f';
const DOC_DATA = { a: 1, b: 2 };
const VERSION = 42;

let persistence: Persistence;

describe('MemoryRemoteDocumentCache', () => {
  beforeEach(async () => {
    persistence = await persistenceHelpers.testMemoryPersistence();
  });

  afterEach(() => persistence.shutdown(/* deleteData= */ true));

  genericRemoteDocumentCacheTests();
});

describe('IndexedDbRemoteDocumentCache', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbRemoteDocumentCache tests.');
    return;
  }

  beforeEach(async () => {
    persistence = await persistenceHelpers.testIndexedDbPersistence({
      synchronizeTabs: true
    });
  });

  afterEach(() => persistence.shutdown(/* deleteData= */ true));

  it('can prune change log', async () => {
    // Add two change batches and remove the first one.
    await persistence.runTransaction(
      'removeDocumentChangesThroughChangeId',
      true,
      txn => {
        const cache = persistence.getRemoteDocumentCache() as IndexedDbRemoteDocumentCache;
        return cache
          .addEntries(txn, [doc('a/1', 1, DOC_DATA), doc('b/1', 2, DOC_DATA)])
          .next(() => cache.addEntries(txn, [doc('c/1', 3, DOC_DATA)]))
          .next(() => cache.removeDocumentChangesThroughChangeId(txn, 1));
      }
    );
    // We removed the first batch, there should be a single batch remaining.
    const remainingChangeCount = await persistence.runTransaction(
      'verify',
      true,
      txn => {
        const store = IndexedDbPersistence.getStore<
          DbRemoteDocumentChangesKey,
          DbRemoteDocumentChanges
        >(txn, DbRemoteDocumentChanges.store);
        return store.count();
      }
    );
    expect(remainingChangeCount).to.equal(1);
  });

  it('skips previous changes', async () => {
    // Add a document to simulate a previous run.
    let cache = new TestRemoteDocumentCache(
      persistence,
      persistence.getRemoteDocumentCache()
    );
    await cache.addEntries([doc('a/1', 1, DOC_DATA)]);
    await persistence.shutdown(/* deleteData= */ false);

    // Start a new run of the persistence layer
    persistence = await persistenceHelpers.testIndexedDbPersistence({
      synchronizeTabs: true,
      dontPurgeData: true
    });
    cache = new TestRemoteDocumentCache(
      persistence,
      persistence.getRemoteDocumentCache()
    );
    const changedDocs = await cache.getNextDocumentChanges();
    assertMatches([], changedDocs);
  });

  genericRemoteDocumentCacheTests();
});

/**
 * Defines the set of tests to run against both remote document cache
 * implementations.
 */
function genericRemoteDocumentCacheTests(): void {
  let cache: TestRemoteDocumentCache;

  function setAndReadDocument(doc: MaybeDocument): Promise<void> {
    return cache
      .addEntries([doc])
      .then(() => {
        return cache.getEntry(doc.key);
      })
      .then(read => {
        expectEqual(read, doc);
      });
  }

  beforeEach(() => {
    cache = new TestRemoteDocumentCache(
      persistence,
      persistence.getRemoteDocumentCache()
    );
  });

  it('returns null for document not in cache', () => {
    return cache.getEntry(key(DOC_PATH)).then(doc => {
      expect(doc).to.equal(null);
    });
  });

  it('can set and read a document', () => {
    return setAndReadDocument(doc(DOC_PATH, VERSION, DOC_DATA));
  });

  it('can set and read a document at a long path', () => {
    return setAndReadDocument(doc(LONG_DOC_PATH, VERSION, DOC_DATA));
  });

  it('can set and read a NoDocument', () => {
    return setAndReadDocument(deletedDoc(DOC_PATH, VERSION));
  });

  it('can set document to new value', () => {
    return cache.addEntries([doc(DOC_PATH, VERSION, DOC_DATA)]).then(() => {
      return setAndReadDocument(doc(DOC_PATH, VERSION + 1, { data: 2 }));
    });
  });

  it('can remove document', () => {
    return cache
      .addEntries([doc(DOC_PATH, VERSION, DOC_DATA)])
      .then(() => {
        return cache.removeEntry(key(DOC_PATH));
      })
      .then(() => {
        return cache.getEntry(key(DOC_PATH));
      })
      .then(read => {
        expect(read).to.equal(null);
      });
  });

  it('can remove nonexistent document', () => {
    // no-op, but make sure it doesn't fail.
    return cache.removeEntry(key(DOC_PATH));
  });

  it('can get documents matching query', async () => {
    // TODO(mikelehen): This just verifies that we do a prefix scan against the
    // query path. We'll need more tests once we add index support.
    await cache.addEntries([
      doc('a/1', VERSION, DOC_DATA),
      doc('b/1', VERSION, DOC_DATA),
      doc('b/2', VERSION, DOC_DATA),
      doc('c/1', VERSION, DOC_DATA)
    ]);

    const query = new Query(path('b'));
    const matchingDocs = await cache.getDocumentsMatchingQuery(query);

    assertMatches(
      [doc('b/1', VERSION, DOC_DATA), doc('b/2', VERSION, DOC_DATA)],
      matchingDocs
    );
  });

  it('can get changes', async () => {
    await cache.addEntries([
      doc('a/1', 1, DOC_DATA),
      doc('b/1', 2, DOC_DATA),
      doc('b/2', 2, DOC_DATA),
      doc('a/1', 3, DOC_DATA)
    ]);

    let changedDocs = await cache.getNextDocumentChanges();
    assertMatches(
      [
        doc('a/1', 3, DOC_DATA),
        doc('b/1', 2, DOC_DATA),
        doc('b/2', 2, DOC_DATA)
      ],
      changedDocs
    );

    await cache.addEntries([doc('c/1', 3, DOC_DATA)]);
    changedDocs = await cache.getNextDocumentChanges();
    assertMatches([doc('c/1', 3, DOC_DATA)], changedDocs);
  });

  it('can get empty changes', async () => {
    const changedDocs = await cache.getNextDocumentChanges();
    assertMatches([], changedDocs);
  });

  it('can get missing documents in changes', async () => {
    await cache.addEntries([
      doc('a/1', 1, DOC_DATA),
      doc('a/2', 2, DOC_DATA),
      doc('a/3', 3, DOC_DATA)
    ]);
    await cache.removeEntry(key('a/2'));

    const changedDocs = await cache.getNextDocumentChanges();
    assertMatches(
      [doc('a/1', 1, DOC_DATA), removedDoc('a/2'), doc('a/3', 3, DOC_DATA)],
      changedDocs
    );
  });
}

function assertMatches(
  expected: MaybeDocument[],
  actual: MaybeDocumentMap
): void {
  expect(actual.size).to.equal(expected.length);
  actual.forEach((actualKey, actualDoc) => {
    const found = expected.find(expectedDoc => {
      if (actualKey.isEqual(expectedDoc.key)) {
        expectEqual(actualDoc, expectedDoc);
        return true;
      }
      return false;
    });

    expect(found).to.exist;
  });
}
