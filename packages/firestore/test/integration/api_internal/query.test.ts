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

import { addEqualityMatcher } from '../../util/equality_matcher';
import { it } from '../../util/mocha_extensions';
import {
  deleteDoc,
  doc,
  DocumentData,
  getDocs,
  query,
  where,
  writeBatch
} from '../util/firebase_export';
import {
  apiDescribe,
  RetryError,
  PERSISTENCE_MODE_UNSPECIFIED,
  withRetry,
  withTestCollection,
  withTestDb
} from '../util/helpers';
import { USE_EMULATOR } from '../util/settings';
import { captureExistenceFilterMismatches } from '../util/testing_hooks_util';

apiDescribe('Queries', persistence => {
  addEqualityMatcher();

  // TODO(b/291365820): Stop skipping this test when running against the
  // Firestore emulator once the emulator is improved to include a bloom filter
  // in the existence filter messages that it sends.
  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it.only)(
    'resuming a query should use bloom filter to avoid full requery',
    async () => {
      // Prepare the names and contents of the 100 documents to create.
      const testDocs: { [key: string]: object } = {};
      for (let i = 0; i < 100; i++) {
        testDocs['doc' + (1000 + i)] = { key: 42 };
      }

      // Ensure that the local cache is configured to use LRU garbage
      // collection (rather than eager garbage collection) so that the resume
      // token and document data does not get prematurely evicted.
      const lruPersistence = persistence.toLruGc();

      return withRetry(async attemptNumber => {
        return withTestCollection(
          lruPersistence,
          testDocs,
          async (coll, db) => {
            // Run a query to populate the local cache with the 100 documents
            // and a resume token.
            const snapshot1 = await getDocs(coll);
            expect(snapshot1.size, 'snapshot1.size').to.equal(100);
            const createdDocuments = snapshot1.docs.map(
              snapshot => snapshot.ref
            );

            // Delete 50 of the 100 documents. Use a different Firestore
            // instance to avoid affecting the local cache.
            const deletedDocumentIds = new Set<string>();
            await withTestDb(PERSISTENCE_MODE_UNSPECIFIED, async db2 => {
              const batch = writeBatch(db2);
              for (let i = 0; i < createdDocuments.length; i += 2) {
                const documentToDelete = doc(db2, createdDocuments[i].path);
                batch.delete(documentToDelete);
                deletedDocumentIds.add(documentToDelete.id);
              }
              await batch.commit();
            });

            // Wait for 10 seconds, during which Watch will stop tracking the
            // query and will send an existence filter rather than "delete"
            // events when the query is resumed.
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Resume the query and save the resulting snapshot for
            // verification. Use some internal testing hooks to "capture" the
            // existence filter mismatches to verify that Watch sent a bloom
            // filter, and it was used to avert a full requery.
            const [existenceFilterMismatches, snapshot2] =
              await captureExistenceFilterMismatches(() => getDocs(coll));

            // Verify that the snapshot from the resumed query contains the
            // expected documents; that is, that it contains the 50 documents
            // that were _not_ deleted.
            const actualDocumentIds = snapshot2.docs
              .map(documentSnapshot => documentSnapshot.ref.id)
              .sort();
            const expectedDocumentIds = createdDocuments
              .filter(documentRef => !deletedDocumentIds.has(documentRef.id))
              .map(documentRef => documentRef.id)
              .sort();
            expect(actualDocumentIds, 'snapshot2.docs').to.deep.equal(
              expectedDocumentIds
            );

            // Verify that Watch sent an existence filter with the correct
            // counts when the query was resumed.
            expect(
              existenceFilterMismatches,
              'existenceFilterMismatches'
            ).to.have.length(1);
            const { localCacheCount, existenceFilterCount, bloomFilter } =
              existenceFilterMismatches[0];
            expect(localCacheCount, 'localCacheCount').to.equal(100);
            expect(existenceFilterCount, 'existenceFilterCount').to.equal(50);

            // Verify that Watch sent a valid bloom filter.
            if (!bloomFilter) {
              expect.fail(
                'The existence filter should have specified a bloom filter ' +
                  'in its `unchanged_names` field.'
              );
              throw new Error('should never get here');
            }

            expect(bloomFilter.hashCount, 'bloomFilter.hashCount').to.be.above(
              0
            );
            expect(
              bloomFilter.bitmapLength,
              'bloomFilter.bitmapLength'
            ).to.be.above(0);
            expect(bloomFilter.padding, 'bloomFilterPadding').to.be.above(0);
            expect(bloomFilter.padding, 'bloomFilterPadding').to.be.below(8);

            // Verify that the bloom filter was successfully used to avert a
            // full requery. If a false positive occurred then retry the entire
            // test. Although statistically rare, false positives are expected
            // to happen occasionally. When a false positive _does_ happen, just
            // retry the test with a different set of documents. If that retry
            // also_ experiences a false positive, then fail the test because
            // that is so improbable that something must have gone wrong.
            if (attemptNumber === 1 && !bloomFilter.applied) {
              throw new RetryError();
            }

            expect(
              bloomFilter.applied,
              `bloomFilter.applied with attemptNumber=${attemptNumber}`
            ).to.be.true;
          }
        );
      });
    }
  ).timeout('90s');

  // TODO(b/291365820): Stop skipping this test when running against the
  // Firestore emulator once the emulator is improved to include a bloom filter
  // in the existence filter messages that it sends.
  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it)(
    'bloom filter should avert a full re-query when documents were added, ' +
      'deleted, removed, updated, and unchanged since the resume token',
    async () => {
      // Prepare the names and contents of the 20 documents to create.
      const testDocs: { [key: string]: object } = {};
      for (let i = 0; i < 20; i++) {
        testDocs['doc' + (1000 + i)] = {
          key: 42,
          removed: false
        };
      }

      // Ensure that the local cache is configured to use LRU garbage
      // collection (rather than eager garbage collection) so that the resume
      // token and document data does not get prematurely evicted.
      const lruPersistence = persistence.toLruGc();

      return withRetry(async attemptNumber => {
        return withTestCollection(lruPersistence, testDocs, async coll => {
          // Run a query to populate the local cache with the 20 documents
          // and a resume token.
          const snapshot1 = await getDocs(
            query(coll, where('removed', '==', false))
          );
          expect(snapshot1.size, 'snapshot1.size').to.equal(20);
          const createdDocuments = snapshot1.docs.map(snapshot => snapshot.ref);

          // Out of the 20 existing documents, leave 5 docs untouched, delete 5 docs,
          // remove 5 docs, update 5 docs, and add 15 new docs.
          const deletedDocumentIds = new Set<string>();
          const removedDocumentIds = new Set<string>();
          const updatedDocumentIds = new Set<string>();
          const addedDocumentIds: string[] = [];

          // Use a different Firestore instance to avoid affecting the local cache.
          await withTestDb(PERSISTENCE_MODE_UNSPECIFIED, async db2 => {
            const batch = writeBatch(db2);

            for (let i = 0; i < createdDocuments.length; i += 4) {
              const documentToDelete = doc(db2, createdDocuments[i].path);
              batch.delete(documentToDelete);
              deletedDocumentIds.add(documentToDelete.id);
            }
            expect(deletedDocumentIds.size).to.equal(5);

            // Update 5 documents to no longer match the query.
            for (let i = 1; i < createdDocuments.length; i += 4) {
              const documentToModify = doc(db2, createdDocuments[i].path);
              batch.update(documentToModify, {
                removed: true
              });
              removedDocumentIds.add(documentToModify.id);
            }
            expect(removedDocumentIds.size).to.equal(5);

            // Update 5 documents, but ensure they still match the query.
            for (let i = 2; i < createdDocuments.length; i += 4) {
              const documentToModify = doc(db2, createdDocuments[i].path);
              batch.update(documentToModify, {
                key: 43
              });
              updatedDocumentIds.add(documentToModify.id);
            }
            expect(updatedDocumentIds.size).to.equal(5);

            for (let i = 0; i < 15; i += 1) {
              const documentToAdd = doc(
                db2,
                coll.path + '/newDoc' + (1000 + i)
              );
              batch.set(documentToAdd, {
                key: 42,
                removed: false
              });
              addedDocumentIds.push(documentToAdd.id);
            }

            // Ensure the sets above are disjoint.
            const mergedSet = new Set<string>();
            [
              deletedDocumentIds,
              removedDocumentIds,
              updatedDocumentIds,
              addedDocumentIds
            ].forEach(set => {
              set.forEach(documentId => mergedSet.add(documentId));
            });
            expect(mergedSet.size).to.equal(30);

            await batch.commit();
          });

          // Wait for 10 seconds, during which Watch will stop tracking the
          // query and will send an existence filter rather than "delete"
          // events when the query is resumed.
          await new Promise(resolve => setTimeout(resolve, 10000));

          // Resume the query and save the resulting snapshot for
          // verification. Use some internal testing hooks to "capture" the
          // existence filter mismatches to verify that Watch sent a bloom
          // filter, and it was used to avert a full requery.
          const [existenceFilterMismatches, snapshot2] =
            await captureExistenceFilterMismatches(() =>
              getDocs(query(coll, where('removed', '==', false)))
            );

          // Verify that the snapshot from the resumed query contains the
          // expected documents; that is, 10 existing documents that still
          // match the query, and 15 documents that are newly added.
          const actualDocumentIds = snapshot2.docs
            .map(documentSnapshot => documentSnapshot.ref.id)
            .sort();
          const expectedDocumentIds = createdDocuments
            .map(documentRef => documentRef.id)
            .filter(documentId => !deletedDocumentIds.has(documentId))
            .filter(documentId => !removedDocumentIds.has(documentId))
            .concat(addedDocumentIds)
            .sort();

          expect(actualDocumentIds, 'snapshot2.docs').to.deep.equal(
            expectedDocumentIds
          );
          expect(actualDocumentIds.length).to.equal(25);

          // Verify that Watch sent an existence filter with the correct
          // counts when the query was resumed.
          expect(
            existenceFilterMismatches,
            'existenceFilterMismatches'
          ).to.have.length(1);
          const { localCacheCount, existenceFilterCount, bloomFilter } =
            existenceFilterMismatches[0];
          expect(localCacheCount, 'localCacheCount').to.equal(35);
          expect(existenceFilterCount, 'existenceFilterCount').to.equal(25);

          // Verify that Watch sent a valid bloom filter.
          if (!bloomFilter) {
            expect.fail(
              'The existence filter should have specified a bloom filter ' +
                'in its `unchanged_names` field.'
            );
            throw new Error('should never get here');
          }

          // Verify that the bloom filter was successfully used to avert a
          // full requery. If a false positive occurred then retry the entire
          // test. Although statistically rare, false positives are expected
          // to happen occasionally. When a false positive _does_ happen, just
          // retry the test with a different set of documents. If that retry
          // also_ experiences a false positive, then fail the test because
          // that is so improbable that something must have gone wrong.
          if (attemptNumber === 1 && !bloomFilter.applied) {
            throw new RetryError();
          }

          expect(
            bloomFilter.applied,
            `bloomFilter.applied with attemptNumber=${attemptNumber}`
          ).to.be.true;
        });
      });
    }
  ).timeout('90s');

  // TODO(b/291365820): Stop skipping this test when running against the
  // Firestore emulator once the emulator is improved to include a bloom filter
  // in the existence filter messages that it sends.
  // eslint-disable-next-line no-restricted-properties
  (USE_EMULATOR ? it.skip : it)(
    'bloom filter should correctly encode complex Unicode characters',
    async () => {
      // Firestore does not do any Unicode normalization on the document IDs.
      // Therefore, two document IDs that are canonically-equivalent (i.e. they
      // visually appear identical) but are represented by a different sequence
      // of Unicode code points are treated as distinct document IDs.
      const testDocIds = [
        'DocumentToDelete',
        // The next two strings both end with "e" with an accent: the first uses
        // the dedicated Unicode code point for this character, while the second
        // uses the standard lowercase "e" followed by the accent combining
        // character.
        'LowercaseEWithAcuteAccent_\u00E9',
        'LowercaseEWithAcuteAccent_\u0065\u0301',
        // The next two strings both end with an "e" with two different accents
        // applied via the following two combining characters. The combining
        // characters are specified in a different order and Firestore treats
        // these document IDs as unique, despite the order of the combining
        // characters being irrelevant.
        'LowercaseEWithMultipleAccents_\u0065\u0301\u0327',
        'LowercaseEWithMultipleAccents_\u0065\u0327\u0301',
        // The next string contains a character outside the BMP (the "basic
        // multilingual plane"); that is, its code point is greater than 0xFFFF.
        // In UTF-16 (which JavaScript uses to store Unicode strings) this
        // requires a surrogate pair, two 16-bit code units, to represent this
        // character. Make sure that its presence is correctly tested in the
        // bloom filter, which uses UTF-8 encoding.
        'Smiley_\u{1F600}'
      ];

      // Verify assumptions about the equivalence of strings in `testDocIds`.
      expect(testDocIds[1].normalize()).equals(testDocIds[2].normalize());
      expect(testDocIds[3].normalize()).equals(testDocIds[4].normalize());
      expect(testDocIds[5]).equals('Smiley_\uD83D\uDE00');

      // Create the mapping from document ID to document data for the document
      // IDs specified in `testDocIds`.
      const testDocs = testDocIds.reduce((map, docId) => {
        map[docId] = { foo: 42 };
        return map;
      }, {} as { [key: string]: DocumentData });

      // Ensure that the local cache is configured to use LRU garbage collection
      // (rather than eager garbage collection) so that the resume token and
      // document data does not get prematurely evicted.
      const lruPersistence = persistence.toLruGc();

      return withTestCollection(lruPersistence, testDocs, async (coll, db) => {
        // Run a query to populate the local cache with documents that have
        // names with complex Unicode characters.
        const snapshot1 = await getDocs(coll);
        const snapshot1DocumentIds = snapshot1.docs.map(
          documentSnapshot => documentSnapshot.id
        );
        expect(snapshot1DocumentIds, 'snapshot1DocumentIds').to.have.members(
          testDocIds
        );

        // Delete one of the documents so that the next call to getDocs() will
        // experience an existence filter mismatch. Use a different Firestore
        // instance to avoid affecting the local cache.
        const documentToDelete = doc(coll, 'DocumentToDelete');
        await withTestDb(PERSISTENCE_MODE_UNSPECIFIED, async db2 => {
          await deleteDoc(doc(db2, documentToDelete.path));
        });

        // Wait for 10 seconds, during which Watch will stop tracking the query
        // and will send an existence filter rather than "delete" events when
        // the query is resumed.
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Resume the query and save the resulting snapshot for verification.
        // Use some internal testing hooks to "capture" the existence filter
        // mismatches.
        const [existenceFilterMismatches, snapshot2] =
          await captureExistenceFilterMismatches(() => getDocs(coll));
        const snapshot2DocumentIds = snapshot2.docs.map(
          documentSnapshot => documentSnapshot.id
        );
        const testDocIdsMinusDeletedDocId = testDocIds.filter(
          documentId => documentId !== documentToDelete.id
        );
        expect(snapshot2DocumentIds, 'snapshot2DocumentIds').to.have.members(
          testDocIdsMinusDeletedDocId
        );

        // Verify that Watch sent an existence filter with the correct counts.
        expect(
          existenceFilterMismatches,
          'existenceFilterMismatches'
        ).to.have.length(1);
        const existenceFilterMismatch = existenceFilterMismatches[0];
        expect(
          existenceFilterMismatch.localCacheCount,
          'localCacheCount'
        ).to.equal(testDocIds.length);
        expect(
          existenceFilterMismatch.existenceFilterCount,
          'existenceFilterCount'
        ).to.equal(testDocIds.length - 1);

        // Verify that we got a bloom filter from Watch.
        const bloomFilter = existenceFilterMismatch.bloomFilter!;
        expect(bloomFilter?.mightContain, 'bloomFilter.mightContain').to.not.be
          .undefined;

        // The bloom filter application should statistically be successful
        // almost every time; the _only_ time when it would _not_ be successful
        // is if there is a false positive when testing for 'DocumentToDelete'
        // in the bloom filter. So verify that the bloom filter application is
        // successful, unless there was a false positive.
        const isFalsePositive = bloomFilter.mightContain(documentToDelete);
        expect(bloomFilter.applied, 'bloomFilter.applied').to.equal(
          !isFalsePositive
        );

        // Verify that the bloom filter contains the document paths with complex
        // Unicode characters.
        for (const testDoc of snapshot2.docs.map(snapshot => snapshot.ref)) {
          expect(
            bloomFilter.mightContain(testDoc),
            `bloomFilter.mightContain('${testDoc.path}')`
          ).to.be.true;
        }
      });
    }
  ).timeout('90s');
});
