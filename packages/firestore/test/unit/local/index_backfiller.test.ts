/**
 * @license
 * Copyright 2022 Google LLC
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

import {Persistence} from "../../../src/local/persistence";
import * as PersistenceTestHelpers from "./persistence_test_helpers";
import {newAsyncQueue} from "../../../src/util/async_queue_impl";
import {User} from "../../../src/auth/user";
import {IndexedDbPersistence} from "../../../src/local/indexeddb_persistence";
import {AsyncQueue} from "../../../src/util/async_queue";
import * as Helpers from '../../util/helpers';
import {IndexKind} from "../../../src/model/field_index";
import {PersistenceTransaction} from "../../../src/local/persistence_transaction";
import {PersistencePromise} from "../../../src/local/persistence_promise";
import {TestSnapshotVersion, version} from "../../util/helpers";
import {RemoteDocumentCache} from "../../../src/local/remote_document_cache";
import {MutableDocument} from "../../../src/model/document";
import {IndexBackfiller} from "../../../src/local/index_backfiller";
import {LocalStore} from "../../../src/local/local_store";
import {TestIndexManager} from "./test_index_manager";
import {JSON_SERIALIZER} from "./persistence_test_helpers";
import {newLocalStore} from "../../../src/local/local_store_impl";
import {CountingQueryEngine} from "./counting_query_engine";

describe.only('IndexedDb IndexBackfiller', () => {
  if (!IndexedDbPersistence.isAvailable()) {
    console.warn('No IndexedDB. Skipping IndexedDb IndexBackfiller tests.');
    return;
  }
  genericIndexBackfillerTests((queue) =>
    PersistenceTestHelpers.testIndexedDbPersistence({ queue })
  );
});

function genericIndexBackfillerTests(
  newPersistence: (queue: AsyncQueue) => Promise<Persistence>
): void {
  const queue = newAsyncQueue();

  beforeEach(async () => {
    await queue.enqueue(async () => {
      if (persistence && persistence.started) {
        await persistence.shutdown();
        await PersistenceTestHelpers.clearTestPersistence();
      }
    });
    persistence = await newPersistence(queue);
    const indexManager = persistence.getIndexManager(User.UNAUTHENTICATED);
    remoteDocumentCache = persistence.getRemoteDocumentCache();
    remoteDocumentCache.setIndexManager(indexManager);
    const queryEngine = new CountingQueryEngine();
    const localStore: LocalStore = newLocalStore(
      persistence,
      queryEngine,
      User.UNAUTHENTICATED,
      JSON_SERIALIZER
    );
    backfiller = new IndexBackfiller(localStore, persistence);

    testIndexManager = new TestIndexManager(persistence, indexManager);
  });

  afterEach(async () => {
    await queue.enqueue(async () => {
      await persistence.shutdown();
    });
  });

  let persistence: Persistence;
  let testIndexManager: TestIndexManager;
  let remoteDocumentCache: RemoteDocumentCache;
  let backfiller: IndexBackfiller;


  it('Writes latest read time to FieldIndex on completion', async () => {
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll1', { fields: [['foo', IndexKind.ASCENDING]] })
    );
    await testIndexManager.addFieldIndex(
      Helpers.fieldIndex('coll2', { fields: [['bar', IndexKind.ASCENDING]] })
    );

    await persistence.runTransaction(
      'Prepare for test',
    'readwrite',
    txn => {
        return PersistencePromise.waitFor([
          addDoc(txn, "coll1/docA", 10, "foo", 1),
          addDoc(txn,"coll2/docA", 20, "bar", 1),
        ]);
    });

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(2);
    }

    {
      const fieldIndex = await testIndexManager.getFieldIndexes( "coll1");
      expect(fieldIndex).to.have.length(1);
      expect(fieldIndex[0].indexState.offset.readTime).to.be.deep.equal(version(10));
    }

    {
      const fieldIndex = await testIndexManager.getFieldIndexes( "coll2");
      expect(fieldIndex).to.have.length(1);
      expect(fieldIndex[0].indexState.offset.readTime).to.be.deep.equal(version(20));
    }

    await persistence.runTransaction(
      'Prepare for test',
      'readwrite',
      txn => {
        return PersistencePromise.waitFor([
          addDoc(txn,"coll1/docB", 50, "foo", 1),
          addDoc(txn,"coll1/docC", 51, "foo", 1),
          addDoc(txn, "coll2/docB", 60, "bar", 1),
          addDoc(txn, "coll2/docC", 61, "bar", 1),
      ]);
    });

    {
      const documentsProcessed = await backfiller.backfill();
      expect(documentsProcessed).to.equal(4);
    }

    {
      const fieldIndex = await testIndexManager.getFieldIndexes( "coll1");
      expect(fieldIndex).to.have.length(1);
      expect(fieldIndex[0].indexState.offset.readTime).to.be.deep.equal(version(51));
    }

    {
      const fieldIndex = await testIndexManager.getFieldIndexes( "coll2");
      expect(fieldIndex).to.have.length(1);
      expect(fieldIndex[0].indexState.offset.readTime).to.be.deep.equal(version(61));
    }
  });

  /** Creates a document and adds it to the RemoteDocumentCache. */
  function addDoc(
    transaction: PersistenceTransaction,
    path: string,
    readTime: TestSnapshotVersion,
    field: string,
    value: number
  ): PersistencePromise<void> {
    return saveDocumentInRemoteDocumentCache(
      transaction,
      Helpers.doc(path, readTime, { [field]: value })
    );
  }

  function saveDocumentInRemoteDocumentCache(
    txn: PersistenceTransaction,
    doc: MutableDocument
  ): PersistencePromise<void> {
    const changeBuffer = remoteDocumentCache.newChangeBuffer();
    return changeBuffer.getEntry(txn, doc.key).next(() => {
      changeBuffer.addEntry(doc);
      return changeBuffer.apply(txn);
    });
  }
}
