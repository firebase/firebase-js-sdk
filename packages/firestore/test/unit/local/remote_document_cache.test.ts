/**
 * @license
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
import { PersistenceTransaction } from '../../../src/local/persistence';
import { PersistencePromise } from '../../../src/local/persistence_promise';
import { RemoteDocumentCache } from '../../../src/local/remote_document_cache';
import { MaybeDocument } from '../../../src/model/document';
import {
  deletedDoc,
  doc,
  expectEqual,
  key,
  path,
  removedDoc
} from '../../util/helpers';

import { isDocumentChangeMissingError } from '../../../src/local/indexeddb_remote_document_cache';
import {
  DbRemoteDocumentChanges,
  DbRemoteDocumentChangesKey
} from '../../../src/local/indexeddb_schema';
import {
  documentKeySet,
  MaybeDocumentMap
} from '../../../src/model/collections';
import { fail } from '../../../src/util/assert';
import * as persistenceHelpers from './persistence_test_helpers';
import {
  TestIndexedDbRemoteDocumentCache,
  TestMemoryRemoteDocumentCache,
  TestRemoteDocumentCache
} from './test_remote_document_cache';

// Helpers for use throughout tests.
const DOC_PATH = 'a/b';
const LONG_DOC_PATH = 'a/b/c/d/e/f';
const DOC_DATA = { a: 1, b: 2 };
const VERSION = 42;

describe('MemoryRemoteDocumentCache', () => {
  let cache: Promise<TestMemoryRemoteDocumentCache>;

  beforeEach(() => {
    cache = persistenceHelpers
      .testMemoryEagerPersistence()
      .then(persistence => new TestMemoryRemoteDocumentCache(persistence));
  });

  genericRemoteDocumentCacheTests(() => cache);

  eagerRemoteDocumentCacheTests(() => cache);
});

describe('LRU MemoryRemoteDocumentCache', () => {
  let cache: Promise<TestMemoryRemoteDocumentCache>;

  beforeEach(async () => {
    cache = persistenceHelpers
      .testMemoryLruPersistence()
      .then(persistence => new TestMemoryRemoteDocumentCache(persistence));
  });

  genericRemoteDocumentCacheTests(() => cache);

  lruRemoteDocumentCacheTests(() => cache);
});

describe('IndexedDbRemoteDocumentCache', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbRemoteDocumentCache tests.');
    return;
  }

  let cache: TestIndexedDbRemoteDocumentCache;
  let persistence: IndexedDbPersistence;
  beforeEach(async () => {
    persistence = await persistenceHelpers.testIndexedDbPersistence({
      synchronizeTabs: true
    });
    cache = new TestIndexedDbRemoteDocumentCache(persistence);
  });

  afterEach(async () => {
    await persistence.shutdown();
    await persistenceHelpers.clearTestPersistence();
  });

  function addEntries(
    txn: PersistenceTransaction,
    cache: RemoteDocumentCache,
    docs: MaybeDocument[]
  ): PersistencePromise<void> {
    const changeBuffer = cache.newChangeBuffer();
    return PersistencePromise.forEach(docs, (doc: MaybeDocument) =>
      changeBuffer.getEntry(txn, doc.key).next(() => {})
    ).next(() => {
      for (const doc of docs) {
        changeBuffer.addEntry(doc);
      }
      return changeBuffer.apply(txn);
    });
  }

  it('can prune change log', async () => {
    // Add two change batches and remove the first one.
    await persistence.runTransaction(
      'removeDocumentChangesThroughChangeId',
      'readwrite',
      txn => {
        const cache = persistence.getRemoteDocumentCache();
        return addEntries(txn, cache, [
          doc('a/1', 1, DOC_DATA),
          doc('b/1', 2, DOC_DATA)
        ])
          .next(() => addEntries(txn, cache, [doc('c/1', 3, DOC_DATA)]))
          .next(() => cache.removeDocumentChangesThroughChangeId(txn, 1));
      }
    );
    // We removed the first batch, there should be a single batch remaining.
    const remainingChangeCount = await persistence.runTransaction(
      'verify',
      'readonly',
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
    await cache.addEntries([doc('a/1', 1, DOC_DATA)]);
    await persistence.shutdown();

    // Start a new run of the persistence layer
    persistence = await persistenceHelpers.testIndexedDbPersistence({
      synchronizeTabs: true,
      dontPurgeData: true
    });
    cache = new TestIndexedDbRemoteDocumentCache(persistence);
    const changedDocs = await cache.getNewDocumentChanges();
    assertMatches([], changedDocs);
  });

  it('can recover from garbage collected change log', async () => {
    // This test is meant to simulate the recovery from a garbage collected
    // document change log.
    // The tests adds four changes (via the `writer`). After the first change is
    // processed by the reader, the writer garbage collects the first and second
    // change. When reader then reads the new changes, it notices that a change
    // is missing. The test then uses `resetLastProcessedDocumentChange` to
    // simulate a successful recovery.

    const writerCache = new TestIndexedDbRemoteDocumentCache(persistence);
    const readerCache = new TestIndexedDbRemoteDocumentCache(persistence);

    await writerCache.addEntries([doc('a/1', 1, DOC_DATA)]);
    let changedDocs = await readerCache.getNewDocumentChanges();
    assertMatches([doc('a/1', 1, DOC_DATA)], changedDocs);

    await writerCache.addEntries([doc('a/2', 2, DOC_DATA)]);
    await writerCache.addEntries([doc('a/3', 3, DOC_DATA)]);
    // Garbage collect change 1 and 2, but not change 3.
    await writerCache.removeDocumentChangesThroughChangeId(2);

    await readerCache
      .getNewDocumentChanges()
      .then(
        () => fail('Missing expected error'),
        err => expect(isDocumentChangeMissingError(err)).to.be.ok
      );

    // Ensure that we can retrieve future changes after the we processed the
    // error
    await writerCache.addEntries([doc('a/4', 4, DOC_DATA)]);
    changedDocs = await readerCache.getNewDocumentChanges();
    assertMatches([doc('a/4', 4, DOC_DATA)], changedDocs);
  });

  genericRemoteDocumentCacheTests(() => Promise.resolve(cache));

  lruRemoteDocumentCacheTests(() => Promise.resolve(cache));
});

function eagerRemoteDocumentCacheTests(
  cachePromise: () => Promise<TestRemoteDocumentCache>
): void {
  let cache: TestRemoteDocumentCache;

  beforeEach(async () => {
    cache = await cachePromise();
  });

  it("doesn't keep track of size", async () => {
    const initialSize = await cache.getSize();
    expect(initialSize).to.equal(0);

    const doc1 = doc('docs/foo', 1, { foo: false, bar: 4 });
    const doc2 = doc('docs/bar', 2, { bar: 'yes', baz: 'also yes' });

    await cache.addEntries([doc1]);
    const doc1Size = await cache.getSize();
    expect(doc1Size).to.equal(0);

    await cache.addEntries([doc2]);
    const totalSize = await cache.getSize();
    expect(totalSize).to.equal(0);

    const doc2Size = await cache.removeEntry(doc2.key);
    expect(doc2Size).to.equal(0);

    const currentSize = await cache.getSize();
    expect(currentSize).to.equal(0);

    const removedSize = await cache.removeEntry(doc1.key);
    expect(removedSize).to.equal(0);

    const finalSize = await cache.getSize();
    expect(finalSize).to.equal(0);
  });
}

function lruRemoteDocumentCacheTests(
  cachePromise: () => Promise<TestRemoteDocumentCache>
): void {
  let cache: TestRemoteDocumentCache;

  beforeEach(async () => {
    cache = await cachePromise();
  });

  it('keeps track of size', async () => {
    const initialSize = await cache.getSize();
    expect(initialSize).to.equal(0);

    const doc1 = doc('docs/foo', 1, { foo: false, bar: 4 });
    const doc2 = doc('docs/bar', 2, { bar: 'yes', baz: 'also yes' });

    // Our size calculation may change, so avoid using hardcoded sizes.

    await cache.addEntries([doc1]);
    const doc1Size = await cache.getSize();
    expect(doc1Size).to.be.greaterThan(0);

    await cache.addEntries([doc2]);
    const totalSize = await cache.getSize();
    expect(totalSize).to.be.greaterThan(doc1Size);

    const expectedDoc2Size = totalSize - doc1Size;
    const doc2Size = await cache.removeEntry(doc2.key);
    expect(doc2Size).to.equal(expectedDoc2Size);

    const currentSize = await cache.getSize();
    expect(currentSize).to.equal(doc1Size);

    const removedSize = await cache.removeEntry(doc1.key);
    expect(removedSize).to.equal(doc1Size);

    const finalSize = await cache.getSize();
    expect(finalSize).to.equal(0);
  });
}

/**
 * Defines the set of tests to run against both remote document cache
 * implementations.
 */
function genericRemoteDocumentCacheTests(
  cachePromise: () => Promise<TestRemoteDocumentCache>
): void {
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

  beforeEach(async () => {
    cache = await cachePromise();
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

  it('can set and read several documents', () => {
    const docs = [
      doc(DOC_PATH, VERSION, DOC_DATA),
      doc(LONG_DOC_PATH, VERSION, DOC_DATA)
    ];
    const key1 = key(DOC_PATH);
    const key2 = key(LONG_DOC_PATH);
    return cache
      .addEntries(docs)
      .then(() => {
        return cache.getEntries(
          documentKeySet()
            .add(key1)
            .add(key2)
        );
      })
      .then(read => {
        expectEqual(read.get(key1), docs[0]);
        expectEqual(read.get(key2), docs[1]);
      });
  });

  it('can set and read several documents including missing document', () => {
    const docs = [
      doc(DOC_PATH, VERSION, DOC_DATA),
      doc(LONG_DOC_PATH, VERSION, DOC_DATA)
    ];
    const key1 = key(DOC_PATH);
    const key2 = key(LONG_DOC_PATH);
    const missingKey = key('foo/nonexistent');
    return cache
      .addEntries(docs)
      .then(() => {
        return cache.getEntries(
          documentKeySet()
            .add(key1)
            .add(key2)
            .add(missingKey)
        );
      })
      .then(read => {
        expectEqual(read.get(key1), docs[0]);
        expectEqual(read.get(key2), docs[1]);
        expect(read.get(missingKey)).to.be.null;
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
      doc('b/1/z/1', VERSION, DOC_DATA),
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

    let changedDocs = await cache.getNewDocumentChanges();
    assertMatches(
      [
        doc('a/1', 3, DOC_DATA),
        doc('b/1', 2, DOC_DATA),
        doc('b/2', 2, DOC_DATA)
      ],
      changedDocs
    );

    await cache.addEntries([doc('c/1', 3, DOC_DATA)]);
    changedDocs = await cache.getNewDocumentChanges();
    assertMatches([doc('c/1', 3, DOC_DATA)], changedDocs);
  });

  it('can get empty changes', async () => {
    const changedDocs = await cache.getNewDocumentChanges();
    assertMatches([], changedDocs);
  });

  it('can get missing documents in changes', async () => {
    await cache.addEntries([
      doc('a/1', 1, DOC_DATA),
      doc('a/2', 2, DOC_DATA),
      doc('a/3', 3, DOC_DATA)
    ]);
    await cache.removeEntry(key('a/2'));

    const changedDocs = await cache.getNewDocumentChanges();
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
