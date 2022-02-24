/**
 * @license
 * Copyright 2020 Google LLC
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

import { ListenSequence } from '../core/listen_sequence';
import { SnapshotVersion } from '../core/snapshot_version';
import { ListenSequenceNumber, TargetId } from '../core/types';
import { DocumentKey } from '../model/document_key';

import {
  decodeResourcePath,
  EncodedResourcePath,
  encodeResourcePath
} from './encoded_resource_path';
import { IndexedDbLruDelegate } from './indexeddb_lru_delegate';
import { mutationQueuesContainKey } from './indexeddb_mutation_queue';
import { DbTargetDocument } from './indexeddb_schema';
import { DbTargetDocumentDocumentTargetsIndex } from './indexeddb_sentinels';
import {
  documentTargetStore,
  IndexedDbTargetCache
} from './indexeddb_target_cache';
import {
  ActiveTargets,
  LruGarbageCollector,
  LruParams
} from './lru_garbage_collector';
import { newLruGarbageCollector } from './lru_garbage_collector_impl';
import { Persistence } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { TargetData } from './target_data';

/** Provides LRU functionality for IndexedDB persistence. */
export class IndexedDbLruDelegateImpl implements IndexedDbLruDelegate {
  readonly garbageCollector: LruGarbageCollector;

  constructor(private readonly db: Persistence, params: LruParams) {
    this.garbageCollector = newLruGarbageCollector(this, params);
  }

  getSequenceNumberCount(
    txn: PersistenceTransaction
  ): PersistencePromise<number> {
    const docCountPromise = this.orphanedDocumentCount(txn);
    const targetCountPromise = this.db.getTargetCache().getTargetCount(txn);
    return targetCountPromise.next(targetCount =>
      docCountPromise.next(docCount => targetCount + docCount)
    );
  }

  private orphanedDocumentCount(
    txn: PersistenceTransaction
  ): PersistencePromise<number> {
    let orphanedCount = 0;
    return this.forEachOrphanedDocumentSequenceNumber(txn, _ => {
      orphanedCount++;
    }).next(() => orphanedCount);
  }

  forEachTarget(
    txn: PersistenceTransaction,
    f: (q: TargetData) => void
  ): PersistencePromise<void> {
    return this.db.getTargetCache().forEachTarget(txn, f);
  }

  forEachOrphanedDocumentSequenceNumber(
    txn: PersistenceTransaction,
    f: (sequenceNumber: ListenSequenceNumber) => void
  ): PersistencePromise<void> {
    return this.forEachOrphanedDocument(txn, (docKey, sequenceNumber) =>
      f(sequenceNumber)
    );
  }

  addReference(
    txn: PersistenceTransaction,
    targetId: TargetId,
    key: DocumentKey
  ): PersistencePromise<void> {
    return writeSentinelKey(txn, key);
  }

  removeReference(
    txn: PersistenceTransaction,
    targetId: TargetId,
    key: DocumentKey
  ): PersistencePromise<void> {
    return writeSentinelKey(txn, key);
  }

  removeTargets(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<number> {
    return (this.db.getTargetCache() as IndexedDbTargetCache).removeTargets(
      txn,
      upperBound,
      activeTargetIds
    );
  }

  markPotentiallyOrphaned(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    return writeSentinelKey(txn, key);
  }

  /**
   * Returns true if anything would prevent this document from being garbage
   * collected, given that the document in question is not present in any
   * targets and has a sequence number less than or equal to the upper bound for
   * the collection run.
   */
  private isPinned(
    txn: PersistenceTransaction,
    docKey: DocumentKey
  ): PersistencePromise<boolean> {
    return mutationQueuesContainKey(txn, docKey);
  }

  removeOrphanedDocuments(
    txn: PersistenceTransaction,
    upperBound: ListenSequenceNumber
  ): PersistencePromise<number> {
    const documentCache = this.db.getRemoteDocumentCache();
    const changeBuffer = documentCache.newChangeBuffer();

    const promises: Array<PersistencePromise<void>> = [];
    let documentCount = 0;

    const iteration = this.forEachOrphanedDocument(
      txn,
      (docKey, sequenceNumber) => {
        if (sequenceNumber <= upperBound) {
          const p = this.isPinned(txn, docKey).next(isPinned => {
            if (!isPinned) {
              documentCount++;
              // Our size accounting requires us to read all documents before
              // removing them.
              return changeBuffer.getEntry(txn, docKey).next(() => {
                changeBuffer.removeEntry(docKey, SnapshotVersion.min());
                return documentTargetStore(txn).delete(sentinelKey(docKey));
              });
            }
          });
          promises.push(p);
        }
      }
    );

    return iteration
      .next(() => PersistencePromise.waitFor(promises))
      .next(() => changeBuffer.apply(txn))
      .next(() => documentCount);
  }

  removeTarget(
    txn: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void> {
    const updated = targetData.withSequenceNumber(txn.currentSequenceNumber);
    return this.db.getTargetCache().updateTargetData(txn, updated);
  }

  updateLimboDocument(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<void> {
    return writeSentinelKey(txn, key);
  }

  /**
   * Call provided function for each document in the cache that is 'orphaned'. Orphaned
   * means not a part of any target, so the only entry in the target-document index for
   * that document will be the sentinel row (targetId 0), which will also have the sequence
   * number for the last time the document was accessed.
   */
  private forEachOrphanedDocument(
    txn: PersistenceTransaction,
    f: (docKey: DocumentKey, sequenceNumber: ListenSequenceNumber) => void
  ): PersistencePromise<void> {
    const store = documentTargetStore(txn);
    let nextToReport: ListenSequenceNumber = ListenSequence.INVALID;
    let nextPath: EncodedResourcePath;
    return store
      .iterate(
        {
          index: DbTargetDocumentDocumentTargetsIndex
        },
        ([targetId, docKey], { path, sequenceNumber }) => {
          if (targetId === 0) {
            // if nextToReport is valid, report it, this is a new key so the
            // last one must not be a member of any targets.
            if (nextToReport !== ListenSequence.INVALID) {
              f(new DocumentKey(decodeResourcePath(nextPath)), nextToReport);
            }
            // set nextToReport to be this sequence number. It's the next one we
            // might report, if we don't find any targets for this document.
            // Note that the sequence number must be defined when the targetId
            // is 0.
            nextToReport = sequenceNumber!;
            nextPath = path;
          } else {
            // set nextToReport to be invalid, we know we don't need to report
            // this one since we found a target for it.
            nextToReport = ListenSequence.INVALID;
          }
        }
      )
      .next(() => {
        // Since we report sequence numbers after getting to the next key, we
        // need to check if the last key we iterated over was an orphaned
        // document and report it.
        if (nextToReport !== ListenSequence.INVALID) {
          f(new DocumentKey(decodeResourcePath(nextPath)), nextToReport);
        }
      });
  }

  getCacheSize(txn: PersistenceTransaction): PersistencePromise<number> {
    return this.db.getRemoteDocumentCache().getSize(txn);
  }
}

function sentinelKey(key: DocumentKey): [TargetId, EncodedResourcePath] {
  return [0, encodeResourcePath(key.path)];
}

/**
 * @returns A value suitable for writing a sentinel row in the target-document
 * store.
 */
function sentinelRow(
  key: DocumentKey,
  sequenceNumber: ListenSequenceNumber
): DbTargetDocument {
  return { targetId: 0, path: encodeResourcePath(key.path), sequenceNumber };
}

function writeSentinelKey(
  txn: PersistenceTransaction,
  key: DocumentKey
): PersistencePromise<void> {
  return documentTargetStore(txn).put(
    sentinelRow(key, txn.currentSequenceNumber)
  );
}
