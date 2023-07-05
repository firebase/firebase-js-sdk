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

import { User } from '../../../src/auth/user';
import { IndexedDbPersistence } from '../../../src/local/indexeddb_persistence';
import {
  documentKeySet,
  DocumentMap,
  newOverlayMap
} from '../../../src/model/collections';
import { MutableDocument, Document } from '../../../src/model/document';
import {
  IndexOffset,
  INITIAL_LARGEST_BATCH_ID,
  newIndexOffsetFromDocument,
  newIndexOffsetSuccessorFromReadTime
} from '../../../src/model/field_index';
import { Overlay } from '../../../src/model/overlay';
import {
  deletedDoc,
  doc,
  expectEqual,
  field,
  filter,
  key,
  query,
  version,
  wrap
} from '../../util/helpers';

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
      .then(persistence => {
        const remoteDocuments = new TestRemoteDocumentCache(persistence);
        remoteDocuments.setIndexManager(
          persistence.getIndexManager(User.UNAUTHENTICATED)
        );
        return remoteDocuments;
      });
  });

  genericRemoteDocumentCacheTests(() => cache);

  eagerRemoteDocumentCacheTests(() => cache);
});

describe('LRU MemoryRemoteDocumentCache', () => {
  let cache: Promise<TestRemoteDocumentCache>;

  beforeEach(async () => {
    cache = persistenceHelpers.testMemoryLruPersistence().then(persistence => {
      const remoteDocuments = new TestRemoteDocumentCache(persistence);
      remoteDocuments.setIndexManager(
        persistence.getIndexManager(User.UNAUTHENTICATED)
      );
      return remoteDocuments;
    });
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
    cache.setIndexManager(persistence.getIndexManager(User.UNAUTHENTICATED));
  });

  afterEach(async () => {
    await persistence.shutdown();
    await persistenceHelpers.clearTestPersistence();
  });

  it('can get next documents from collection group', async () => {
    await cache.addEntries([
      doc('a/1', 1, DOC_DATA),
      doc('a/2', 2, DOC_DATA),
      doc('b/1', 3, DOC_DATA)
    ]);

    const results = await cache.getAllFromCollectionGroup(
      'a',
      IndexOffset.min(),
      Number.MAX_SAFE_INTEGER
    );
    assertMatches([doc('a/1', 1, DOC_DATA), doc('a/2', 2, DOC_DATA)], results);
  });

  it('can get next documents from collection group with limit', async () => {
    await cache.addEntries([
      doc('a/1', 1, DOC_DATA),
      doc('b/2/a/2', 2, DOC_DATA),
      doc('a/3', 3, DOC_DATA)
    ]);

    const results = await cache.getAllFromCollectionGroup(
      'a',
      IndexOffset.min(),
      2
    );
    assertMatches(
      [doc('a/1', 1, DOC_DATA), doc('b/2/a/2', 2, DOC_DATA)],
      results
    );
  });

  it('can get next documents from collection group with read time offset', async () => {
    await cache.addEntries([
      doc('a/1', 1, DOC_DATA),
      doc('a/2', 2, DOC_DATA),
      doc('a/3', 3, DOC_DATA)
    ]);

    const results = await cache.getAllFromCollectionGroup(
      'a',
      newIndexOffsetSuccessorFromReadTime(version(1), INITIAL_LARGEST_BATCH_ID),
      2
    );
    assertMatches([doc('a/2', 2, DOC_DATA), doc('a/3', 3, DOC_DATA)], results);
  });

  it('can get next documents from collection group with document key offset', async () => {
    await cache.addEntries([
      doc('a/1', 1, DOC_DATA),
      doc('a/2', 1, DOC_DATA),
      doc('a/3', 1, DOC_DATA)
    ]);

    const results = await cache.getAllFromCollectionGroup(
      'a',
      newIndexOffsetFromDocument(doc('a/1', 1, DOC_DATA)),
      Number.MAX_SAFE_INTEGER
    );
    assertMatches([doc('a/2', 1, DOC_DATA), doc('a/3', 1, DOC_DATA)], results);
  });

  it('can get next documents from non-existing collection group', async () => {
    const results = await cache.getAllFromCollectionGroup(
      'a',
      IndexOffset.min(),
      Number.MAX_SAFE_INTEGER
    );
    assertMatches([], results);
  });

  it('can get next documents from collection group', async () => {
    await cache.addEntries([
      doc('a/1', 1, DOC_DATA),
      doc('a/2', 2, DOC_DATA),
      doc('b/1', 3, DOC_DATA)
    ]);

    const results = await cache.getAllFromCollectionGroup(
      'a',
      IndexOffset.min(),
      Number.MAX_SAFE_INTEGER
    );
    assertMatches([doc('a/1', 1, DOC_DATA), doc('a/2', 2, DOC_DATA)], results);
  });

  it('can get next documents from collection group with limit', async () => {
    await cache.addEntries([
      doc('a/1', 1, DOC_DATA),
      doc('b/2/a/2', 2, DOC_DATA),
      doc('a/3', 3, DOC_DATA)
    ]);

    const results = await cache.getAllFromCollectionGroup(
      'a',
      IndexOffset.min(),
      2
    );
    assertMatches(
      [doc('a/1', 1, DOC_DATA), doc('b/2/a/2', 2, DOC_DATA)],
      results
    );
  });

  it('can get next documents from collection group with read time offset', async () => {
    await cache.addEntries([
      doc('a/1', 1, DOC_DATA),
      doc('a/2', 2, DOC_DATA),
      doc('a/3', 3, DOC_DATA)
    ]);

    const results = await cache.getAllFromCollectionGroup(
      'a',
      newIndexOffsetSuccessorFromReadTime(version(1), INITIAL_LARGEST_BATCH_ID),
      2
    );
    assertMatches([doc('a/2', 2, DOC_DATA), doc('a/3', 3, DOC_DATA)], results);
  });

  it('can get next documents from collection group with document key offset', async () => {
    await cache.addEntries([
      doc('a/1', 1, DOC_DATA),
      doc('a/2', 1, DOC_DATA),
      doc('a/3', 1, DOC_DATA)
    ]);

    const results = await cache.getAllFromCollectionGroup(
      'a',
      newIndexOffsetFromDocument(doc('a/1', 1, DOC_DATA)),
      Number.MAX_SAFE_INTEGER
    );
    assertMatches([doc('a/2', 1, DOC_DATA), doc('a/3', 1, DOC_DATA)], results);
  });

  it('can get next documents from non-existing collection group', async () => {
    const results = await cache.getAllFromCollectionGroup(
      'a',
      IndexOffset.min(),
      Number.MAX_SAFE_INTEGER
    );
    assertMatches([], results);
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

  function setAndReadDocument(doc: MutableDocument): Promise<void> {
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

  it('returns an invalid document for documents not in cache', () => {
    return cache.getEntry(key(DOC_PATH)).then(doc => {
      expect(doc.isValidDocument()).to.be.false;
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
      .addEntries(docs)
      .then(() => cache.getEntries(documentKeySet(key1, key2)))
      .then(read => {
        expectEqual(read.get(key1), docs[0]);
        expectEqual(read.get(key2), docs[1]);
      });
  });

  it('can set and read several documents with overlapping keys', () => {
    // This test verifies that the sorting works correctly in IndexedDB,
    // which sorts by prefix path first.
    const keys = ['a/b', 'a/b/c/d', 'a/b/c/d/e/f', 'a/c', 'c/b/d/e', 'f/g'];
    const docs = keys.map(k => doc(k, VERSION, DOC_DATA));
    return cache
      .addEntries(docs)
      .then(() => cache.getEntries(documentKeySet(...keys.map(k => key(k)))))
      .then(read => {
        expect(read.size).to.equal(keys.length);
      });
  });

  it('can set and read several documents with deeply nested keys', () => {
    // This test verifies that the sorting works correctly in IndexedDB,
    // which sorts by prefix path first.
    // Repro of https://github.com/firebase/firebase-js-sdk/issues/6110
    const keys = ['a/a/a/a/a/a/a/a', 'b/b/b/b/a/a', 'c/c/a/a', 'd/d'];
    return cache
      .addEntries(keys.map(k => doc(k, VERSION, DOC_DATA)))
      .then(() => cache.getEntries(documentKeySet(...keys.map(k => key(k)))))
      .then(read => {
        expect(read.size).to.equal(keys.length);
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
      .then(() => cache.getEntries(documentKeySet(key1, key2, missingKey)))
      .then(read => {
        expectEqual(read.get(key1), docs[0]);
        expectEqual(read.get(key2), docs[1]);
        expect(read.get(missingKey)?.isValidDocument()).to.be.false;
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
        expect(read.isValidDocument()).to.be.false;
      });
  });

  it('can remove nonexistent document', () => {
    // no-op, but make sure it doesn't fail.
    return cache.removeEntry(key(DOC_PATH));
  });

  it('can get all documents from collection', async () => {
    await cache.addEntries([
      doc('a/1', VERSION, DOC_DATA),
      doc('b/1', VERSION, DOC_DATA),
      doc('b/2', VERSION, DOC_DATA),
      doc('c/1', VERSION, DOC_DATA)
    ]);

    const matchingDocs = await cache.getDocumentsMatchingQuery(
      query('b'),
      IndexOffset.min(),
      newOverlayMap()
    );
    assertMatches(
      [doc('b/1', VERSION, DOC_DATA), doc('b/2', VERSION, DOC_DATA)],
      matchingDocs
    );
  });

  it('getAll() excludes subcollection', async () => {
    await cache.addEntries([
      doc('a/1', VERSION, DOC_DATA),
      doc('a/1/b/1', VERSION, DOC_DATA)
    ]);

    const matchingDocs = await cache.getDocumentsMatchingQuery(
      query('a'),
      IndexOffset.min(),
      newOverlayMap()
    );
    assertMatches([doc('a/1', VERSION, DOC_DATA)], matchingDocs);
  });

  it('can get all documents since read time', async () => {
    await cache.addEntries([
      doc('b/old', 1, DOC_DATA).setReadTime(version(11))
    ]);
    await cache.addEntries([
      doc('b/current', 2, DOC_DATA).setReadTime(version(12))
    ]);
    await cache.addEntries([
      doc('b/new', 3, DOC_DATA).setReadTime(version(13))
    ]);

    const matchingDocs = await cache.getDocumentsMatchingQuery(
      query('b'),
      newIndexOffsetSuccessorFromReadTime(
        version(12),
        INITIAL_LARGEST_BATCH_ID
      ),
      newOverlayMap()
    );
    assertMatches([doc('b/new', 3, DOC_DATA)], matchingDocs);
  });

  it('getDocumentsMatchingQuery() applies query check', async () => {
    await cache.addEntries([
      doc('a/1', 1, { matches: true }).setReadTime(version(1))
    ]);
    await cache.addEntries([
      doc('a/2', 1, { matches: true }).setReadTime(version(2))
    ]);
    await cache.addEntries([
      doc('a/3', 1, { matches: false }).setReadTime(version(3))
    ]);

    const matchingDocs = await cache.getDocumentsMatchingQuery(
      query('a', filter('matches', '==', true)),
      newIndexOffsetSuccessorFromReadTime(version(1), INITIAL_LARGEST_BATCH_ID),
      newOverlayMap()
    );
    assertMatches([doc('a/2', 1, { matches: true })], matchingDocs);
  });

  it('getDocumentsMatchingQuery() respects mutated documents', async () => {
    await cache.addEntries([
      doc('a/1', 1, { matches: true }).setReadTime(version(1))
    ]);
    await cache.addEntries([
      doc('a/2', 1, { matches: false }).setReadTime(version(2))
    ]);

    const mutatedDocs = newOverlayMap();
    mutatedDocs.set(key('a/2'), {} as Overlay);
    const matchingDocs = await cache.getDocumentsMatchingQuery(
      query('a', filter('matches', '==', true)),
      newIndexOffsetSuccessorFromReadTime(version(1), INITIAL_LARGEST_BATCH_ID),
      mutatedDocs
    );
    assertMatches([doc('a/2', 1, { matches: false })], matchingDocs);
  });

  it('getAll() uses read time rather than update time', async () => {
    await cache.addEntries([doc('b/old', 1, DOC_DATA).setReadTime(version(2))]);
    await cache.addEntries([doc('b/new', 2, DOC_DATA).setReadTime(version(1))]);

    const matchingDocs = await cache.getDocumentsMatchingQuery(
      query('b'),
      newIndexOffsetSuccessorFromReadTime(version(1), INITIAL_LARGEST_BATCH_ID),
      newOverlayMap()
    );
    assertMatches([doc('b/old', 1, DOC_DATA)], matchingDocs);
  });

  it('does not apply document modifications to cache', async () => {
    // This test verifies that the MemoryMutationCache returns copies of all
    // data to ensure that the documents in the cache cannot be modified.
    function verifyOldValue(d: Document): void {
      expect(d.data.field(field('state'))).to.deep.equal(wrap('old'));
    }

    let document = doc('coll/doc', 1, { state: 'old' });
    await cache.addEntries([document.setReadTime(version(1))]);
    verifyOldValue(document);
    document.data.set(field('state'), wrap('new'));

    document = await cache.getEntry(key('coll/doc'));
    verifyOldValue(document);
    document.data.set(field('state'), wrap('new'));

    document = await cache
      .getEntries(documentKeySet(key('coll/doc')))
      .then(m => m.get(key('coll/doc'))!);
    verifyOldValue(document);
    document.data.set(field('state'), wrap('new'));

    document = await cache
      .getEntries(documentKeySet(key('coll/doc')))
      .then(m => m.get(key('coll/doc'))!);
    verifyOldValue(document);
    document.data.set(field('state'), wrap('new'));

    document = await cache
      .getDocumentsMatchingQuery(
        query('coll'),
        IndexOffset.min(),
        newOverlayMap()
      )
      .then(m => m.get(key('coll/doc'))!);
    verifyOldValue(document);

    document = await cache.getEntry(key('coll/doc'));
    verifyOldValue(document);
  });
}

function assertMatches(expected: MutableDocument[], actual: DocumentMap): void {
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
