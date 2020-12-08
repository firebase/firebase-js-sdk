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

import { SnapshotVersion } from '../core/snapshot_version';
import { canonifyTarget, Target, targetEquals } from '../core/target';
import { TargetIdGenerator } from '../core/target_id_generator';
import { ListenSequenceNumber, TargetId } from '../core/types';
import { DocumentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { debugAssert } from '../util/assert';
import { ObjectMap } from '../util/obj_map';

import { ActiveTargets } from './lru_garbage_collector';
import { Persistence } from './persistence';
import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';
import { ReferenceSet } from './reference_set';
import { TargetCache } from './target_cache';
import { TargetData } from './target_data';

export class MemoryTargetCache implements TargetCache {
  /**
   * Maps a target to the data about that target
   */
  private targets = new ObjectMap<Target, TargetData>(
    t => canonifyTarget(t),
    targetEquals
  );

  /** The last received snapshot version. */
  private lastRemoteSnapshotVersion = SnapshotVersion.min();
  /** The highest numbered target ID encountered. */
  private highestTargetId: TargetId = 0;
  /** The highest sequence number encountered. */
  private highestSequenceNumber: ListenSequenceNumber = 0;
  /**
   * A ordered bidirectional mapping between documents and the remote target
   * IDs.
   */
  private references = new ReferenceSet();

  private targetCount = 0;

  private targetIdGenerator = TargetIdGenerator.forTargetCache();

  constructor(private readonly persistence: Persistence) {}

  forEachTarget(
    txn: PersistenceTransaction,
    f: (q: TargetData) => void
  ): PersistencePromise<void> {
    this.targets.forEach((_, targetData) => f(targetData));
    return PersistencePromise.resolve();
  }

  getLastRemoteSnapshotVersion(
    transaction: PersistenceTransaction
  ): PersistencePromise<SnapshotVersion> {
    return PersistencePromise.resolve(this.lastRemoteSnapshotVersion);
  }

  getHighestSequenceNumber(
    transaction: PersistenceTransaction
  ): PersistencePromise<ListenSequenceNumber> {
    return PersistencePromise.resolve(this.highestSequenceNumber);
  }

  allocateTargetId(
    transaction: PersistenceTransaction
  ): PersistencePromise<TargetId> {
    this.highestTargetId = this.targetIdGenerator.next();
    return PersistencePromise.resolve(this.highestTargetId);
  }

  setTargetsMetadata(
    transaction: PersistenceTransaction,
    highestListenSequenceNumber: number,
    lastRemoteSnapshotVersion?: SnapshotVersion
  ): PersistencePromise<void> {
    if (lastRemoteSnapshotVersion) {
      this.lastRemoteSnapshotVersion = lastRemoteSnapshotVersion;
    }
    if (highestListenSequenceNumber > this.highestSequenceNumber) {
      this.highestSequenceNumber = highestListenSequenceNumber;
    }
    return PersistencePromise.resolve();
  }

  private saveTargetData(targetData: TargetData): void {
    this.targets.set(targetData.target, targetData);
    const targetId = targetData.targetId;
    if (targetId > this.highestTargetId) {
      this.targetIdGenerator = new TargetIdGenerator(targetId);
      this.highestTargetId = targetId;
    }
    if (targetData.sequenceNumber > this.highestSequenceNumber) {
      this.highestSequenceNumber = targetData.sequenceNumber;
    }
  }

  addTargetData(
    transaction: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void> {
    debugAssert(
      !this.targets.has(targetData.target),
      'Adding a target that already exists'
    );
    this.saveTargetData(targetData);
    this.targetCount += 1;
    return PersistencePromise.resolve();
  }

  updateTargetData(
    transaction: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void> {
    debugAssert(
      this.targets.has(targetData.target),
      'Updating a non-existent target'
    );
    this.saveTargetData(targetData);
    return PersistencePromise.resolve();
  }

  removeTargetData(
    transaction: PersistenceTransaction,
    targetData: TargetData
  ): PersistencePromise<void> {
    debugAssert(this.targetCount > 0, 'Removing a target from an empty cache');
    debugAssert(
      this.targets.has(targetData.target),
      'Removing a non-existent target from the cache'
    );
    this.targets.delete(targetData.target);
    this.references.removeReferencesForId(targetData.targetId);
    this.targetCount -= 1;
    return PersistencePromise.resolve();
  }

  removeTargets(
    transaction: PersistenceTransaction,
    upperBound: ListenSequenceNumber,
    activeTargetIds: ActiveTargets
  ): PersistencePromise<number> {
    let count = 0;
    const removals: Array<PersistencePromise<void>> = [];
    this.targets.forEach((key, targetData) => {
      if (
        targetData.sequenceNumber <= upperBound &&
        activeTargetIds.get(targetData.targetId) === null
      ) {
        this.targets.delete(key);
        removals.push(
          this.removeMatchingKeysForTargetId(transaction, targetData.targetId)
        );
        count++;
      }
    });
    return PersistencePromise.waitFor(removals).next(() => count);
  }

  getTargetCount(
    transaction: PersistenceTransaction
  ): PersistencePromise<number> {
    return PersistencePromise.resolve(this.targetCount);
  }

  getTargetData(
    transaction: PersistenceTransaction,
    target: Target
  ): PersistencePromise<TargetData | null> {
    const targetData = this.targets.get(target) || null;
    return PersistencePromise.resolve(targetData);
  }

  addMatchingKeys(
    txn: PersistenceTransaction,
    keys: DocumentKeySet,
    targetId: TargetId
  ): PersistencePromise<void> {
    this.references.addReferences(keys, targetId);
    return PersistencePromise.resolve();
  }

  removeMatchingKeys(
    txn: PersistenceTransaction,
    keys: DocumentKeySet,
    targetId: TargetId
  ): PersistencePromise<void> {
    this.references.removeReferences(keys, targetId);
    const referenceDelegate = this.persistence.referenceDelegate;
    const promises: Array<PersistencePromise<void>> = [];
    if (referenceDelegate) {
      keys.forEach(key => {
        promises.push(referenceDelegate.markPotentiallyOrphaned(txn, key));
      });
    }
    return PersistencePromise.waitFor(promises);
  }

  removeMatchingKeysForTargetId(
    txn: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<void> {
    this.references.removeReferencesForId(targetId);
    return PersistencePromise.resolve();
  }

  getMatchingKeysForTargetId(
    txn: PersistenceTransaction,
    targetId: TargetId
  ): PersistencePromise<DocumentKeySet> {
    const matchingKeys = this.references.referencesForId(targetId);
    return PersistencePromise.resolve(matchingKeys);
  }

  containsKey(
    txn: PersistenceTransaction,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    return PersistencePromise.resolve(this.references.containsKey(key));
  }
}
