/**
 * @license
 * Copyright 2024 Google LLC
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
import { encodeBase64 } from '../../../src/platform/base64';
import { ByteString } from '../../../src/util/byte_string';

import * as persistenceHelpers from './persistence_test_helpers';
import { TestGlobalsCache } from './test_globals_cache';
import { TestPipelineResultsCache } from './test_pipeline_results_cache';
import { doc, expectEqual, version } from '../../util/helpers';
import { isArrayEqual } from '../../../src/util/array';
import {
  MutableDocumentMap,
  mutableDocumentMap
} from '../../../src/model/collections';
import { MutableDocument } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';

let persistence: Persistence;

describe('MemoryPipelineResultsCache', () => {
  beforeEach(() => {
    return persistenceHelpers.testMemoryEagerPersistence().then(p => {
      persistence = p;
    });
  });

  genericPipelineResultsCacheTests();
});

describe('IndexedDbPipelineResultsCache', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDbPipelineResultsCache tests.');
    return;
  }

  beforeEach(() => {
    return persistenceHelpers.testIndexedDbPersistence().then(p => {
      persistence = p;
    });
  });

  genericPipelineResultsCacheTests();
});

function genericPipelineResultsCacheTests(): void {
  let cache: TestPipelineResultsCache;

  beforeEach(() => {
    cache = new TestPipelineResultsCache(persistence);
  });

  afterEach(async () => {
    await persistence.shutdown();
    await persistenceHelpers.clearTestPersistence();
  });

  function toDocumentMap(docs: MutableDocument[]): MutableDocumentMap {
    let result = mutableDocumentMap();
    for (const doc of docs) {
      result = result.insert(doc.key, doc);
    }
    return result;
  }

  function expectDocumentsEqual(
    actual: MutableDocumentMap,
    expected: MutableDocumentMap
  ) {
    expect(actual.size).to.equal(expected.size, 'Document count mismatch');

    actual.forEach((key, actualDoc) => {
      const expectedDoc = expected.get(key);
      expect(expectedDoc).to.not.be.undefined,
        `Document ${key.toString()} not found in expected results`;
      expect(actualDoc.isEqual(expectedDoc!)).to.be.true,
        `Document ${key.toString()} does not match`;
    });

    expected.forEach(key => {
      const actualDoc = actual.get(key);
      expect(actualDoc).to.not.be.undefined,
        `Document ${key.toString()} not found in actual results`;
    });
  }

  it('returns previously saved pipeline results', async () => {
    const targetId = 1;
    const executionTime = version(1000);
    const results = [
      doc('users/foo', 500, { name: 'foo' }).setReadTime(executionTime),
      doc('users/bar', 700, { name: 'bar' }).setReadTime(executionTime)
    ];
    await cache.updateResults(targetId, executionTime, results, []);
    const retrievedResults = await cache.getResults(targetId);

    expectDocumentsEqual(retrievedResults?.results!, toDocumentMap(results));
    expect(retrievedResults?.executionTime).to.deep.equal(executionTime);
  });

  it('returns previously saved empty results', async () => {
    const targetId = 1;
    const executionTime = version(1000);
    await cache.updateResults(targetId, executionTime, [], []);
    const retrievedResults = await cache.getResults(targetId);

    expectDocumentsEqual(retrievedResults?.results!, toDocumentMap([]));
    expect(retrievedResults?.executionTime).to.deep.equal(executionTime);
  });

  it('returns undefined for mismatches', async () => {
    const retrievedResults = await cache.getResults(1);
    expect(retrievedResults).to.be.undefined;
  });

  it('handles multiple rounds of updates', async () => {
    const targetId = 1;
    const initialTime = version(1000);
    const updateTime1 = version(1500);
    const updateTime2 = version(2000);

    // Initial set of documents
    const initialDocs = [
      doc('users/alice', 500, { name: 'Alice' }).setReadTime(initialTime),
      doc('users/bob', 600, { name: 'Bob' }).setReadTime(initialTime)
    ];
    await cache.updateResults(targetId, initialTime, initialDocs, []);

    // First round of updates: update Alice, add Charlie
    const update1Docs = [
      doc('users/alice', 700, { name: 'Alice', age: 30 }).setReadTime(
        updateTime1
      ),
      doc('users/charlie', 800, { name: 'Charlie' }).setReadTime(updateTime1)
    ];
    await cache.updateResults(targetId, updateTime1, update1Docs, []);

    // Second round of updates: delete Bob, update Charlie
    const update2Docs = [
      doc('users/charlie', 900, { name: 'Charlie', age: 25 }).setReadTime(
        updateTime2
      )
    ];
    await cache.updateResults(targetId, updateTime2, update2Docs, [
      DocumentKey.fromPath('users/bob')
    ]);

    // Retrieve and verify final results
    const retrievedResults = await cache.getResults(targetId);

    expect(retrievedResults).to.not.be.undefined;
    expect(retrievedResults?.executionTime).to.deep.equal(updateTime2);

    const expectedFinalDocs = [
      doc('users/alice', 700, { name: 'Alice', age: 30 }).setReadTime(
        updateTime1
      ),
      doc('users/charlie', 900, { name: 'Charlie', age: 25 }).setReadTime(
        updateTime2
      )
    ];

    expectDocumentsEqual(
      retrievedResults!.results,
      toDocumentMap(expectedFinalDocs)
    );
  });

  it('handles deleting all results then re-fill', async () => {
    const targetId = 1;
    const initialTime1 = version(1000);
    const updateTime2 = version(2000);
    const updateTime3 = version(2000);

    // Initial set of documents
    const initialDocs = [
      doc('users/alice', 500, { name: 'Alice' }).setReadTime(initialTime1),
      doc('users/bob', 600, { name: 'Bob' }).setReadTime(initialTime1)
    ];
    await cache.updateResults(targetId, initialTime1, initialDocs, []);

    // Verify initial state
    let retrievedResults = await cache.getResults(targetId);
    expect(retrievedResults).to.not.be.undefined;
    expectDocumentsEqual(retrievedResults!.results, toDocumentMap(initialDocs));

    // Delete all documents
    const deleteKeys = initialDocs.map(doc => doc.key);
    await cache.updateResults(targetId, updateTime2, [], deleteKeys);

    // Verify empty state
    retrievedResults = await cache.getResults(targetId);
    expect(retrievedResults).to.not.be.undefined;
    expect(retrievedResults!.results.size).to.equal(0);

    // Re-fill with new documents
    const newDocs = [
      doc('users/charlie', 700, { name: 'Charlie' }).setReadTime(updateTime3),
      doc('users/david', 800, { name: 'David' }).setReadTime(updateTime3)
    ];
    await cache.updateResults(targetId, updateTime3, newDocs, []);

    // Verify final state
    retrievedResults = await cache.getResults(targetId);
    expect(retrievedResults).to.not.be.undefined;
    expect(retrievedResults?.executionTime).to.deep.equal(updateTime3);
    expectDocumentsEqual(retrievedResults!.results, toDocumentMap(newDocs));
  });

  it('setResults() clears all previous records', async () => {
    const targetId = 1;
    const initialTime = version(1000);
    const updateTime = version(2000);

    // Initial set of documents
    const initialDocs = [
      doc('users/alice', 500, { name: 'Alice' }).setReadTime(initialTime),
      doc('users/bob', 600, { name: 'Bob' }).setReadTime(initialTime)
    ];
    await cache.updateResults(targetId, initialTime, initialDocs, []);

    // Verify initial state
    let retrievedResults = await cache.getResults(targetId);
    expect(retrievedResults).to.not.be.undefined;
    expectDocumentsEqual(retrievedResults!.results, toDocumentMap(initialDocs));

    // Set new results, which should clear previous records
    const newDocs = [
      doc('users/charlie', 700, { name: 'Charlie' }).setReadTime(updateTime),
      doc('users/david', 800, { name: 'David' }).setReadTime(updateTime)
    ];
    await cache.setResults(targetId, updateTime, newDocs, []);

    // Verify new state
    retrievedResults = await cache.getResults(targetId);
    expect(retrievedResults).to.not.be.undefined;
    expect(retrievedResults?.executionTime).to.deep.equal(updateTime);
    expectDocumentsEqual(retrievedResults!.results, toDocumentMap(newDocs));
  });
}
