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
import { IndexedDbIndexManager } from '../local/indexeddb_index_manager';
import { IndexedDbPersistence } from '../local/indexeddb_persistence';
import { LocalDocumentsView } from '../local/local_documents_view';
import { LruParams } from '../local/lru_garbage_collector';
import { QueryEngine } from '../local/query_engine';
import { getDocument, getWindow } from '../platform/dom';
import { JsonProtoSerializer } from '../remote/serializer';
import { AsyncQueueImpl } from '../util/async_queue_impl';
import { AutoId } from '../util/misc';

export function runPersistentCacheIndexPerformanceExperiment(
  log: (...args: unknown[]) => unknown
): void {
  const { queryEngine } = createTestObjects();
  log('Created QueryEngine', queryEngine);
}

interface TestObjects {
  queryEngine: QueryEngine;
}

function createTestObjects(): TestObjects {
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

  return { queryEngine };
}
