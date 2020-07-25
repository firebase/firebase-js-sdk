/**
 * @license
 * Copyright 2017 Google LLC
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
import { SnapshotVersion } from '../../../src/core/snapshot_version';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import { MaybeDocument } from '../../../src/model/document';
import {
  deletedDoc,
  doc,
  expectEqual,
  key,
  query,
  removedDoc,
  version
} from '../../util/helpers';
import {
  documentKeySet,
  MaybeDocumentMap
} from '../../../src/model/collections';
import * as persistenceHelpers from './persistence_test_helpers';
import { TestRemoteDocumentCache } from './test_remote_document_cache';

// Helpers for use throughout tests.
const DOC_PATH = 'a/b';
const LONG_DOC_PATH = 'a/b/c/d/e/f';
const DOC_DATA = { a: 1, b: 2 };
const VERSION = 42;

describe('MemoryRemoteDocumentCache', () => {
  let cache: Promise<TestRemoteDocumentCache>;

  beforeEach(() => {
    cache = persistenceHelpers
      .testMemoryEagerPersistence()
      .then(persistence => new TestRemoteDocumentCache(persistence));
  });

  genericRemoteDocumentCacheTests(() => cache);

  eagerRemoteDocumentCacheTests(() => cache);
});

describe('LRU MemoryRemoteDocumentCache', () => {
  let cache: Promise<TestRemoteDocumentCache>;

  beforeEach(async () => {
    cache = persistenceHelpers
      .testMemoryLruPersistence()
      .then(persistence => new TestRemoteDocumentCache(persistence));
  });

  genericRemoteDocumentCacheTests(() => cache);

  lruRemoteDocumentCacheTests(() => cache);
});

describe('IndexedDbRemoteDocumentCache', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbRemoteDocumentCache tests.');
    return;
  }

  let cache: TestRemoteDocumentCache;
  let persistence: IndexedDbPersistence;
  beforeEach(async () => {
    persistence = await persistenceHelpers.testIndexedDbPersistence({
      synchronizeTabs: true
    });
    cache = new TestRemoteDocumentCache(persistence);
  });

  afterEach(async () => {
    await persistence.shutdown();
    await persistenceHelpers.clearTestPersistence();
  });

  function getLastReadTime(): Promise<SnapshotVersion> {
    return persistence.runTransaction('getLastReadTime', 'readonly', txn => {
      const remoteDocuments = persistence.getRemoteDocumentCache();
      return remoteDocuments.getLastReadTime(txn);
    });
  }

  it('skips previous changes', async () => {
    // Add a document to simulate a previous run.
    await cache.addEntries([doc('a/1', 1, DOC_DATA)], version(1));
    await persistence.shutdown();

    // Start a new run of the persistence layer
    persistence = await persistenceHelpers.testIndexedDbPersistence({
      synchronizeTabs: true,
      dontPurgeData: true
    });
    cache = new TestRemoteDocumentCache(persistence);
    const readTime = await getLastReadTime();
    const { changedDocs } = await cache.getNewDocumentChanges(readTime);
    assertMatches([], changedDocs);
  });

  it('can get changes', async () => {
    await cache.addEntries(
      [
        doc('a/1', 1, DOC_DATA),
        doc('b/1', 2, DOC_DATA),
        doc('b/2', 2, DOC_DATA),
        doc('a/1', 3, DOC_DATA)
      ],
      version(3)
    );

    let { changedDocs, readTime } = await cache.getNewDocumentChanges(
      SnapshotVersion.min()
    );
    assertMatches(
      [
        doc('a/1', 3, DOC_DATA),
        doc('b/1', 2, DOC_DATA),
        doc('b/2', 2, DOC_DATA)
      ],
      changedDocs
    );

    await cache.addEntry(doc('c/1', 4, DOC_DATA));
    changedDocs = (await cache.getNewDocumentChanges(readTime)).changedDocs;
    assertMatches([doc('c/1', 4, DOC_DATA)], changedDocs);
  });

  it('can get empty changes', async () => {
    const { changedDocs } = await cache.getNewDocumentChanges(
      SnapshotVersion.min()
    );
    assertMatches([], changedDocs);
  });

  it('can get missing documents in changes', async () => {
    await cache.addEntries(
      [
        doc('a/1', 1, DOC_DATA),
        doc('a/2', 2, DOC_DATA),
        doc('a/3', 3, DOC_DATA)
      ],
      version(3)
    );
    await cache.removeEntry(key('a/2'), version(4));

    const { changedDocs } = await cache.getNewDocumentChanges(
      SnapshotVersion.min()
    );
    assertMatches(
      [doc('a/1', 1, DOC_DATA), removedDoc('a/2'), doc('a/3', 3, DOC_DATA)],
      changedDocs
    );
  });

  genericRemoteDocumentCacheTests(async () => cache);

  lruRemoteDocumentCacheTests(async () => cache);
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

    await cache.addEntry(doc1);
    const doc1Size = await cache.getSize();
    expect(doc1Size).to.equal(0);

    await cache.addEntry(doc2);
    const totalSize = await cache.getSize();
    expect(totalSize).to.equal(0);

    await cache.removeEntry(doc2.key);

    const currentSize = await cache.getSize();
    expect(currentSize).to.equal(0);

    await cache.removeEntry(doc1.key);

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

    await cache.addEntry(doc1);
    const doc1Size = await cache.getSize();
    expect(doc1Size).to.be.greaterThan(0);

    await cache.addEntry(doc2);
    const totalSize = await cache.getSize();
    expect(totalSize).to.be.greaterThan(doc1Size);

    await cache.removeEntry(doc2.key);

    const currentSize = await cache.getSize();
    expect(currentSize).to.equal(doc1Size);

    await cache.removeEntry(doc1.key);

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
      .addEntry(doc)
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
    return cache.addEntry(doc(DOC_PATH, VERSION, DOC_DATA)).then(() => {
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
      .addEntries(docs, version(VERSION))
      .then(() => {
        return cache.getEntries(documentKeySet().add(key1).add(key2));
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
      .addEntries(docs, version(VERSION))
      .then(() => {
        return cache.getEntries(
          documentKeySet().add(key1).add(key2).add(missingKey)
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
      .addEntry(doc(DOC_PATH, VERSION, DOC_DATA))
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
    await cache.addEntries(
      [
        doc('a/1', VERSION, DOC_DATA),
        doc('b/1', VERSION, DOC_DATA),
        doc('b/1/z/1', VERSION, DOC_DATA),
        doc('b/2', VERSION, DOC_DATA),
        doc('c/1', VERSION, DOC_DATA)
      ],
      version(VERSION)
    );

    const query1 = query('b');
    const matchingDocs = await cache.getDocumentsMatchingQuery(
      query1,
      SnapshotVersion.min()
    );

    assertMatches(
      [doc('b/1', VERSION, DOC_DATA), doc('b/2', VERSION, DOC_DATA)],
      matchingDocs
    );
  });

  it('can get documents matching query by read time', async () => {
    await cache.addEntries(
      [doc('b/old', 1, DOC_DATA)],
      /* readTime= */ version(11)
    );
    await cache.addEntries(
      [doc('b/current', 2, DOC_DATA)],
      /* readTime= */ version(12)
    );
    await cache.addEntries(
      [doc('b/new', 3, DOC_DATA)],
      /* readTime= */ version(13)
    );

    const query1 = query('b');
    const matchingDocs = await cache.getDocumentsMatchingQuery(
      query1,
      /* sinceReadTime= */ version(12)
    );
    assertMatches([doc('b/new', 3, DOC_DATA)], matchingDocs);
  });

  it('query matching uses read time rather than update time', async () => {
    await cache.addEntries(
      [doc('b/old', 1, DOC_DATA)],
      /* readTime= */ version(2)
    );
    await cache.addEntries(
      [doc('b/new', 2, DOC_DATA)],
      /* readTime= */ version(1)
    );

    const query1 = query('b');
    const matchingDocs = await cache.getDocumentsMatchingQuery(
      query1,
      /* sinceReadTime= */ version(1)
    );
    assertMatches([doc('b/old', 1, DOC_DATA)], matchingDocs);
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
