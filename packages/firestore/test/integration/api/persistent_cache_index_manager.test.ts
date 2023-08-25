/**
 * @license
 * Copyright 2023 Google LLC
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

import {
  deleteAllPersistentCacheIndexes,
  disablePersistentCacheIndexAutoCreation,
  doc,
  enablePersistentCacheIndexAutoCreation,
  getDoc,
  getDocs,
  getDocsFromCache,
  getPersistentCacheIndexManager,
  PersistentCacheIndexManager,
  query,
  terminate,
  where
} from '../util/firebase_export';
import {
  apiDescribe,
  partitionedTestDocs,
  withTestCollection,
  withTestDb
} from '../util/helpers';

apiDescribe('PersistentCacheIndexManager', persistence => {
  describe('getPersistentCacheIndexManager()', () => {
    it('should return non-null if, and only if, IndexedDB persistence is enabled', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db);
        if (persistence.storage === 'indexeddb') {
          expect(indexManager).to.be.instanceof(PersistentCacheIndexManager);
        } else {
          expect(indexManager).to.be.null;
        }
      }));

    it('should always return the same object', () =>
      withTestDb(persistence, async db => {
        const indexManager1 = getPersistentCacheIndexManager(db);
        const indexManager2 = getPersistentCacheIndexManager(db);
        expect(indexManager1).to.equal(indexManager2);
      }));

    it('should fail if invoked after terminate()', () =>
      withTestDb(persistence, async db => {
        terminate(db).catch(e => expect.fail(`terminate() failed: ${e}`));
        expect(() => getPersistentCacheIndexManager(db)).to.throw(
          'The client has already been terminated.'
        );
      }));
  });

  // Skip the rest of the tests since they require `PersistentCacheIndexManager`
  // support, which is only available with indexeddb persistence.
  if (persistence.storage !== 'indexeddb') {
    return;
  }

  describe('enable/disable persistent index auto creation', () => {
    it('enable on new instance should succeed', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        enablePersistentCacheIndexAutoCreation(indexManager);
      }));

    it('disable on new instance should succeed', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        disablePersistentCacheIndexAutoCreation(indexManager);
      }));

    it('enable when already enabled should succeed', async () =>
      withTestDb(persistence, async db => {
        const documentRef = doc(db, 'a/b');
        const indexManager = getPersistentCacheIndexManager(db)!;
        enablePersistentCacheIndexAutoCreation(indexManager);
        await getDoc(documentRef); // flush the async queue
        enablePersistentCacheIndexAutoCreation(indexManager);
        enablePersistentCacheIndexAutoCreation(indexManager);
      }));

    it('disable when already disabled should succeed', async () =>
      withTestDb(persistence, async db => {
        const documentRef = doc(db, 'a/b');
        const indexManager = getPersistentCacheIndexManager(db)!;
        disablePersistentCacheIndexAutoCreation(indexManager);
        await getDoc(documentRef); // flush the async queue
        disablePersistentCacheIndexAutoCreation(indexManager);
        disablePersistentCacheIndexAutoCreation(indexManager);
      }));

    it('enabling after terminate() should throw', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        terminate(db).catch(e => expect.fail(`terminate() failed: ${e}`));
        expect(() =>
          enablePersistentCacheIndexAutoCreation(indexManager)
        ).to.throw('The client has already been terminated.');
      }));

    it('disabling after terminate() should throw', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        terminate(db).catch(e => expect.fail(`terminate() failed: ${e}`));
        expect(() =>
          disablePersistentCacheIndexAutoCreation(indexManager)
        ).to.throw('The client has already been terminated.');
      }));

    it('query returns correct results when index is auto-created', () => {
      const testDocs = partitionedTestDocs({
        matching: { documentData: { match: true }, documentCount: 1 },
        nonmatching: { documentData: { match: false }, documentCount: 100 }
      });
      return withTestCollection(persistence, testDocs, async (coll, db) => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        enablePersistentCacheIndexAutoCreation(indexManager);

        // Populate the local cache with the entire collection's contents.
        await getDocs(coll);

        // Run a query that matches only one of the documents in the collection;
        // this should cause an index to be auto-created.
        const query_ = query(coll, where('match', '==', true));
        const snapshot1 = await getDocsFromCache(query_);
        expect(snapshot1.size).to.equal(1);

        // Run the query that matches only one of the documents again, which
        // should _still_ return the one and only document that matches. Since
        // the public API surface does not reveal whether an index was used,
        // there isn't anything else that can be verified.
        const snapshot2 = await getDocsFromCache(query_);
        expect(snapshot2.size).to.equal(1);
      });
    });
  });

  describe('delete all persistent cache indexes', () => {
    it('deleteAllPersistentCacheIndexes() on new instance should succeed', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        deleteAllPersistentCacheIndexes(indexManager);
      }));

    it('deleteAllPersistentCacheIndexes() should be successful when auto-indexing is enabled', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        enablePersistentCacheIndexAutoCreation(indexManager);
        deleteAllPersistentCacheIndexes(indexManager);
      }));

    it('deleteAllPersistentCacheIndexes() should be successful when auto-indexing is disabled', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        enablePersistentCacheIndexAutoCreation(indexManager);
        disablePersistentCacheIndexAutoCreation(indexManager);
        deleteAllPersistentCacheIndexes(indexManager);
      }));

    it('deleteAllPersistentCacheIndexes() after terminate() should throw', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        terminate(db).catch(e => expect.fail(`terminate() failed: ${e}`));
        expect(() => deleteAllPersistentCacheIndexes(indexManager)).to.throw(
          'The client has already been terminated.'
        );
      }));

    it('query returns correct results when auto-created index has been deleted', () => {
      const testDocs = partitionedTestDocs({
        matching: { documentData: { match: true }, documentCount: 1 },
        nonmatching: { documentData: { match: false }, documentCount: 100 }
      });
      return withTestCollection(persistence, testDocs, async (coll, db) => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        enablePersistentCacheIndexAutoCreation(indexManager);

        // Populate the local cache with the entire collection's contents.
        await getDocs(coll);

        // Run a query that matches only one of the documents in the collection;
        // this should cause an index to be auto-created.
        const query_ = query(coll, where('match', '==', true));
        const snapshot1 = await getDocsFromCache(query_);
        expect(snapshot1.size).to.equal(1);

        // Delete the index
        deleteAllPersistentCacheIndexes(indexManager);

        // Run the query that matches only one of the documents again, which
        // should _still_ return the one and only document that matches. Since
        // the public API surface does not reveal whether an index was used,
        // there isn't anything else that can be verified.
        const snapshot2 = await getDocsFromCache(query_);
        expect(snapshot2.size).to.equal(1);
      });
    });
  });
});
