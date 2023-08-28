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

import { User } from '../auth/user';
import { DatabaseId } from '../core/database_info';
import { FieldFilter, Operator } from '../core/filter';
import { QueryImpl, queryToTarget } from '../core/query';
import { SnapshotVersion } from '../core/snapshot_version';
import { IndexManager } from '../local/index_manager';
import { IndexedDbIndexManager } from '../local/indexeddb_index_manager';
import { IndexedDbPersistence } from '../local/indexeddb_persistence';
import { LocalDocumentsView } from '../local/local_documents_view';
import { LruParams } from '../local/lru_garbage_collector';
import { Persistence } from '../local/persistence';
import { PersistencePromise } from '../local/persistence_promise';
import { QueryEngine } from '../local/query_engine';
import { documentKeySet, documentMap } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { IndexOffset } from '../model/field_index';
import { ObjectValue } from '../model/object_value';
import { FieldPath, ResourcePath } from '../model/path';
import { getDocument, getWindow } from '../platform/dom';
import { JsonProtoSerializer } from '../remote/serializer';
import { AsyncQueueImpl } from '../util/async_queue_impl';
import { AutoId } from '../util/misc';

import { Timestamp } from './timestamp';


interface ExperimentConfig {
  /** The number of documents to create in the collection. */
  documentCount: number;
  /** The number of fields in each document. */
  fieldCount: number;
  /** The number of documents that match the query. */
  documentMatchCount: number;
}

export async function runPersistentCacheIndexPerformanceExperiment(
  config: ExperimentConfig,
  log: (...args: unknown[]) => unknown
): Promise<void> {
  const { persistence, indexManager, queryEngine } = await createTestObjects();
  const collectionId = AutoId.newId();

  const query = createQuery(collectionId, 'matches', Operator.EQUAL, true);
  const target = queryToTarget(query);
  await persistence.runTransaction('createTargetIndexes', 'readwrite', txn => {
    log('createTargetIndexes()');
    return indexManager.createTargetIndexes(txn, queryToTarget(query));
  });

  await persistence.runTransaction('populate collection', 'readwrite', txn => {
    log('populate collection');
    const documentIds: string[] = [];
    for (let i = 0; i < config.documentCount; i++) {
      documentIds.push(AutoId.newId());
    }
    const matchingDocumentIds = new Set<string>();
    while (matchingDocumentIds.size < config.documentMatchCount) {
      const matchingDocumentIdIndex = Math.floor(
        Math.random() * documentIds.length
      );
      matchingDocumentIds.add(documentIds[matchingDocumentIdIndex]);
    }
    const documents: Array<{ documentId: string; value: ObjectValue }> = [];
    for (const documentId of documentIds) {
      const value = ObjectValue.empty();
      for (let fieldIndex = 0; fieldIndex < config.fieldCount; fieldIndex++) {
        const fieldPath = new FieldPath([AutoId.newId()]);
        value.set(fieldPath, { stringValue: `field${fieldIndex}` });
      }
      if (matchingDocumentIds.has(documentId)) {
        value.set(new FieldPath(['matches']), { booleanValue: true });
      }
      documents.push({ documentId, value });
    }
    return PersistencePromise.forEach(
      documents,
      (documentInfo: { documentId: string; value: ObjectValue }) => {
        const { documentId, value } = documentInfo;
        const documentKey = DocumentKey.fromSegments([
          collectionId,
          documentId
        ]);
        const changeBuffer = persistence
          .getRemoteDocumentCache()
          .newChangeBuffer();
        return changeBuffer.getEntry(txn, documentKey).next(document => {
          changeBuffer.addEntry(
            document.convertToFoundDocument(
              SnapshotVersion.fromTimestamp(Timestamp.fromMillis(1)),
              value
            )
          );
          return changeBuffer
            .apply(txn)
            .next(() =>
              indexManager.updateIndexEntries(txn, documentMap(document))
            )
            .next(() =>
              indexManager.updateCollectionGroup(
                txn,
                collectionId,
                new IndexOffset(document.readTime, document.key, -1)
              )
            );
        });
      }
    );
  });

  const queryResult = await persistence.runTransaction(
    'populate collection',
    'readwrite',
    txn => {
      log('getDocumentsMatchingQuery()');
      return queryEngine.getDocumentsMatchingQuery(
        txn,
        query,
        SnapshotVersion.min(),
        documentKeySet()
      );
    }
  );

  log(`getDocumentsMatchingQuery() returned ${queryResult.size} documents`);

  await persistence.shutdown();
}

interface TestObjects {
  persistence: Persistence;
  indexManager: IndexManager;
  queryEngine: QueryEngine;
}

async function createTestObjects(): Promise<TestObjects> {
  const databaseId = new DatabaseId(/*projectId=*/ AutoId.newId());
  const user = new User(/*uid=*/ null);
  const persistence = new IndexedDbPersistence(
    /*allowTabSynchronization=*/ false,
    /*persistenceKey=*/ AutoId.newId(),
    /*clientId=*/ AutoId.newId(),
    /*lruParams=*/ LruParams.DISABLED,
    /*queue=*/ new AsyncQueueImpl(),
    /*window=*/ getWindow(),
    /*document=*/ getDocument(),
    /*serializer=*/ new JsonProtoSerializer(
      databaseId,
      /*useProto3Json=*/ true
    ),
    /*sequenceNumberSyncer=*/ {
      writeSequenceNumber(_: unknown): void {},
      sequenceNumberHandler: null
    },
    /*forceOwningTab=*/ false
  );

  await persistence.start();

  const remoteDocumentCache = persistence.getRemoteDocumentCache();
  const indexManager = new IndexedDbIndexManager(user, databaseId);
  const mutationQueue = persistence.getMutationQueue(user, indexManager);
  const documentOverlayCache = persistence.getDocumentOverlayCache(user);
  const localDocumentView = new LocalDocumentsView(
    remoteDocumentCache,
    mutationQueue,
    documentOverlayCache,
    indexManager
  );
  const queryEngine = new QueryEngine();
  queryEngine.initialize(localDocumentView, indexManager);

  return { persistence, indexManager, queryEngine };
}

function createQuery(
  path: string,
  field: string,
  op: Operator,
  value: boolean
): QueryImpl {
  const fieldPath = FieldPath.fromServerFormat(field);
  const filter = FieldFilter.create(fieldPath, op, { booleanValue: value });
  return new QueryImpl(
    /*path=*/ ResourcePath.fromString(path),
    /*collectionGroup=*/ null,
    /*explicitOrderBy=*/ [],
    /*filters=*/ [filter]
  );
}
