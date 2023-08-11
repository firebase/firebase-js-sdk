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
  getDocs,
  getDocsFromCache,
  query,
  terminate,
  where,
  _disablePersistentCacheIndexAutoCreation as disablePersistentCacheIndexAutoCreation,
  _enablePersistentCacheIndexAutoCreation as enablePersistentCacheIndexAutoCreation,
  _getPersistentCacheIndexManager as getPersistentCacheIndexManager,
  _PersistentCacheIndexManager as PersistentCacheIndexManager,
  _TestingHooks as TestingHooks
} from '../util/firebase_export';
import {
  apiDescribe,
  partitionedTestDocs,
  withTestCollection,
  withTestDb
} from '../util/helpers';
import {
  getQueryIndexType,
  setPersistentCacheIndexAutoCreationSettings,
  verifyPersistentCacheIndexAutoCreationToggleSucceedsDuring
} from '../util/testing_hooks_util';

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

  describe('enablePersistentCacheIndexAutoCreation()', () => {
    it('should return successfully', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        enablePersistentCacheIndexAutoCreation(indexManager);
      }));

    it('should successfully enable indexing when not yet enabled', () =>
      withTestDb(persistence, db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        return verifyPersistentCacheIndexAutoCreationToggleSucceedsDuring(() =>
          enablePersistentCacheIndexAutoCreation(indexManager)
        );
      }));

    it('should successfully enable indexing when already enabled', () =>
      withTestDb(persistence, db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        return verifyPersistentCacheIndexAutoCreationToggleSucceedsDuring(() =>
          enablePersistentCacheIndexAutoCreation(indexManager)
        );
      }));

    it('should successfully enable indexing after being disabled', () =>
      withTestDb(persistence, db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        enablePersistentCacheIndexAutoCreation(indexManager);
        disablePersistentCacheIndexAutoCreation(indexManager);
        return verifyPersistentCacheIndexAutoCreationToggleSucceedsDuring(() =>
          enablePersistentCacheIndexAutoCreation(indexManager)
        );
      }));

    it('should fail if invoked after terminate()', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        terminate(db).catch(e => expect.fail(`terminate() failed: ${e}`));
        expect(() =>
          enablePersistentCacheIndexAutoCreation(indexManager)
        ).to.throw('The client has already been terminated.');
      }));
  });

  describe('disablePersistentCacheIndexAutoCreation(()', () => {
    it('should return successfully', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        disablePersistentCacheIndexAutoCreation(indexManager);
      }));

    it('should successfully disable indexing when not yet enabled', () =>
      withTestDb(persistence, db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        return verifyPersistentCacheIndexAutoCreationToggleSucceedsDuring(() =>
          disablePersistentCacheIndexAutoCreation(indexManager)
        );
      }));

    it('should successfully disable indexing when enabled', () =>
      withTestDb(persistence, db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        enablePersistentCacheIndexAutoCreation(indexManager);
        return verifyPersistentCacheIndexAutoCreationToggleSucceedsDuring(() =>
          disablePersistentCacheIndexAutoCreation(indexManager)
        );
      }));

    it('should successfully enable indexing after being disabled', () =>
      withTestDb(persistence, db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        enablePersistentCacheIndexAutoCreation(indexManager);
        disablePersistentCacheIndexAutoCreation(indexManager);
        return verifyPersistentCacheIndexAutoCreationToggleSucceedsDuring(() =>
          disablePersistentCacheIndexAutoCreation(indexManager)
        );
      }));

    it('should fail if invoked after terminate()', () =>
      withTestDb(persistence, async db => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        terminate(db).catch(e => expect.fail(`terminate() failed: ${e}`));
        expect(() =>
          disablePersistentCacheIndexAutoCreation(indexManager)
        ).to.throw('The client has already been terminated.');
      }));
  });

  describe('Query execution', () => {
    it('Auto-indexing is disabled by default', () =>
      testIndexesGetAutoCreated({
        documentCounts: { matching: 1, notMatching: 5 },
        expectedIndexAutoCreated: false,
        indexAutoCreationEnabled: false,
        indexAutoCreationMinCollectionSize: 0,
        relativeIndexReadCostPerDocument: 2
      }));

    it(
      'Default indexAutoCreationMinCollectionSize=100: ' +
        'index should *not* be auto-created if lookup scanned 99 documents',
      () =>
        testIndexesGetAutoCreated({
          documentCounts: { matching: 1, notMatching: 98 },
          expectedIndexAutoCreated: false
        })
    );

    it(
      'Default indexAutoCreationMinCollectionSize=100' +
        ' index *should* be auto-created if lookup scanned 100 documents',
      () =>
        testIndexesGetAutoCreated({
          documentCounts: { matching: 1, notMatching: 99 },
          expectedIndexAutoCreated: true
        })
    );

    it(
      'Default relativeIndexReadCostPerDocument=2: ' +
        'index should *not* be auto-created if the relative index read cost is matched exactly',
      () =>
        testIndexesGetAutoCreated({
          documentCounts: { matching: 50, notMatching: 50 },
          expectedIndexAutoCreated: false
        })
    );

    it(
      'Default relativeIndexReadCostPerDocument=2: ' +
        'index *should* be auto-created if the relative index read cost is exceeded slightly',
      () =>
        testIndexesGetAutoCreated({
          documentCounts: { matching: 49, notMatching: 51 },
          expectedIndexAutoCreated: true
        })
    );

    it('Indexes are only auto-created when enabled', async () => {
      const testDocs = partitionedTestDocs({
        FooMatches: {
          documentData: { foo: 'match' },
          documentCount: 1
        },
        BarMatches: {
          documentData: { bar: 'match' },
          documentCount: 2
        },
        BazMatches: {
          documentData: { baz: 'match' },
          documentCount: 3
        },
        NeitherFooNorBarNorMazMatch: {
          documentData: { foo: 'nomatch', bar: 'nomatch', baz: 'nomatch' },
          documentCount: 10
        }
      });

      return withTestCollection(persistence, testDocs, async (coll, db) => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        expect(indexManager, 'indexManager').is.not.null;
        await setPersistentCacheIndexAutoCreationSettings(indexManager, {
          indexAutoCreationMinCollectionSize: 0,
          relativeIndexReadCostPerDocument: 2
        });

        // Populate the local cache with the entire collection.
        await getDocs(coll);

        // Enable automatic index creation and run a query, ensuring that an
        // appropriate index is created.
        enablePersistentCacheIndexAutoCreation(indexManager);
        const query1 = query(coll, where('foo', '==', 'match'));
        const snapshot1 = await getDocsFromCache(query1);
        expect(snapshot1.size, 'snapshot1.size').to.equal(1);
        expect(
          await getQueryIndexType(query1),
          'getQueryIndexType(query1)'
        ).to.equal('full');

        // Disable automatic index creation and run a query, ensuring that an
        // appropriate index is _not_ created, and the other is maintained.
        disablePersistentCacheIndexAutoCreation(indexManager);
        const query2 = query(coll, where('bar', '==', 'match'));
        const snapshot2 = await getDocsFromCache(query2);
        expect(snapshot2.size, 'snapshot2.size').to.equal(2);
        expect(
          await getQueryIndexType(query2),
          'getQueryIndexType(query2)'
        ).to.equal('none');
        expect(
          await getQueryIndexType(query1),
          'getQueryIndexType(query1) check #2'
        ).to.equal('full');

        // Re-enable automatic index creation and run a query, ensuring that an
        // appropriate index is created, and others are maintained.
        enablePersistentCacheIndexAutoCreation(indexManager);
        const query3 = query(coll, where('baz', '==', 'match'));
        const snapshot3 = await getDocsFromCache(query3);
        expect(snapshot3.size, 'snapshot3.size').to.equal(3);
        expect(
          await getQueryIndexType(query3),
          'getQueryIndexType(query3)'
        ).to.equal('full');
        expect(
          await getQueryIndexType(query2),
          'getQueryIndexType(query2) check #2'
        ).to.equal('none');
        expect(
          await getQueryIndexType(query1),
          'getQueryIndexType(query1) check #3'
        ).to.equal('full');
      });
    });

    it('A full index is not auto-created if there is a partial index match', async () => {
      const testDocs = partitionedTestDocs({
        FooMatches: {
          documentData: { foo: 'match' },
          documentCount: 5
        },
        FooAndBarBothMatch: {
          documentData: { foo: 'match', bar: 'match' },
          documentCount: 1
        },
        NeitherFooNorBarMatch: {
          documentData: { foo: 'nomatch', bar: 'nomatch' },
          documentCount: 15
        }
      });

      return withTestCollection(persistence, testDocs, async (coll, db) => {
        const indexManager = getPersistentCacheIndexManager(db)!;
        expect(indexManager, 'indexManager').is.not.null;
        enablePersistentCacheIndexAutoCreation(indexManager);
        await setPersistentCacheIndexAutoCreationSettings(indexManager, {
          indexAutoCreationMinCollectionSize: 0,
          relativeIndexReadCostPerDocument: 2
        });

        // Populate the local cache with the entire collection.
        await getDocs(coll);

        // Run a query to have an index on the 'foo' field created.
        {
          const fooQuery = query(coll, where('foo', '==', 'match'));
          const fooSnapshot = await getDocsFromCache(fooQuery);
          expect(fooSnapshot.size, 'fooSnapshot.size').to.equal(6);
          expect(
            await getQueryIndexType(fooQuery),
            'getQueryIndexType(fooQuery)'
          ).to.equal('full');
        }

        // Run a query that filters on both 'foo' and 'bar' fields and ensure
        // that the partial index (created by the previous query's execution)
        // is NOT upgraded to a full index. Note that in the future we _may_
        // change this behavior since a full index would likely be beneficial to
        // the query's execution performance.
        {
          const fooBarQuery = query(
            coll,
            where('foo', '==', 'match'),
            where('bar', '==', 'match')
          );
          expect(
            await getQueryIndexType(fooBarQuery),
            'getQueryIndexType(fooBarQuery) before'
          ).to.equal('partial');
          const fooBarSnapshot = await getDocsFromCache(fooBarQuery);
          expect(fooBarSnapshot.size, 'fooBarSnapshot.size').to.equal(1);
          expect(
            await getQueryIndexType(fooBarQuery),
            'getQueryIndexType(fooBarQuery) after'
          ).to.equal('partial');
        }
      });
    });

    async function testIndexesGetAutoCreated(config: {
      documentCounts: { matching: number; notMatching: number };
      expectedIndexAutoCreated: boolean;
      indexAutoCreationEnabled?: boolean;
      indexAutoCreationMinCollectionSize?: number;
      relativeIndexReadCostPerDocument?: number;
    }): Promise<void> {
      const testDocs = partitionedTestDocs({
        matching: {
          documentData: { foo: 'match' },
          documentCount: config.documentCounts.matching
        },
        notMatching: {
          documentData: { foo: 'nomatch' },
          documentCount: config.documentCounts.notMatching
        }
      });

      return withTestCollection(persistence, testDocs, async (coll, db) => {
        // Populate the local cache with the entire collection.
        await getDocs(coll);

        // Configure automatic index creation, as requested.
        const indexManager = getPersistentCacheIndexManager(db)!;
        expect(indexManager, 'indexManager').is.not.null;
        if (config.indexAutoCreationEnabled ?? true) {
          enablePersistentCacheIndexAutoCreation(indexManager);
        }
        if (
          config.indexAutoCreationMinCollectionSize !== undefined ||
          config.relativeIndexReadCostPerDocument !== undefined
        ) {
          await TestingHooks.setPersistentCacheIndexAutoCreationSettings(
            indexManager,
            config
          );
        }

        // Run a query against the local cache that matches a _subset_ of the
        // entire collection.
        const query_ = query(coll, where('foo', '==', 'match'));
        const snapshot = await getDocsFromCache(query_);
        expect(snapshot.size, 'snapshot.size').to.equal(
          config.documentCounts.matching
        );

        // Verify that an index was or was not created, as expected.
        expect(await getQueryIndexType(query_), 'getQueryIndexType()').to.equal(
          config.expectedIndexAutoCreated ? 'full' : 'none'
        );
      });
    }
  });
});
