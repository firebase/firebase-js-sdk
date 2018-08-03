/**
 * Copyright 2017 Google Inc.
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

import { TargetId } from './types';
import { assert } from '../util/assert';

const RESERVED_BITS = 1;

enum GeneratorIds {
  QueryCache = 0, // The target IDs for user-issued queries are even (end in 0).
  SyncEngine = 1 // The target IDs for limbo detection are odd (end in 1).
}

/**
 * Generates monotonically increasing target IDs for sending targets to the
 * watch stream.
 *
 * The client constructs two generators, one for the query cache (via
 * forQueryCache()), and one for limbo documents (via forSyncEngine()). These
 * two generators produce non-overlapping IDs (by using even and odd IDs
 * respectively).
 *
 * By separating the target ID space, the query cache can generate target IDs
 * that persist across client restarts, while sync engine can independently
 * generate in-memory target IDs that are transient and can be reused after a
 * restart.
 */
// TODO(mrschmidt): Explore removing this class in favor of generating these IDs
// directly in SyncEngine and LocalStore.
export class TargetIdGenerator {
  private nextId: TargetId;

  /**
   * Instantiates a new TargetIdGenerator. If a seed is provided, the generator
   * will use the seed value as the next target ID.
   */
  constructor(private generatorId: number, seed?: number) {
    assert(
      (generatorId & RESERVED_BITS) === generatorId,
      `Generator ID ${generatorId} contains more than ${RESERVED_BITS} reserved bits`
    );
    this.seek(seed !== undefined ? seed : this.generatorId);
  }

  next(): TargetId {
    const nextId = this.nextId;
    this.nextId += 1 << RESERVED_BITS;
    return nextId;
  }

  /**
   * Returns the ID that follows the given ID. Subsequent calls to `next()`
   * use the newly returned target ID as their base.
   */
  after(targetId: TargetId): TargetId {
    this.seek(targetId + (1 << RESERVED_BITS));
    return this.next();
  }

  private seek(targetId: TargetId): void {
    assert(
      (targetId & RESERVED_BITS) === this.generatorId,
      'Cannot supply target ID from different generator ID'
    );
    this.nextId = targetId;
  }

  static forQueryCache(): TargetIdGenerator {
    // We seed the query cache generator to return '2' as its first ID, as there
    // is no differentiation in the protocol layer between an unset number and
    // the number '0'. If we were to sent a target with target ID '0', the
    // backend would consider it unset and replace it with its own ID.
    const targetIdGenerator = new TargetIdGenerator(GeneratorIds.QueryCache, 2);
    return targetIdGenerator;
  }

  static forSyncEngine(): TargetIdGenerator {
    // Sync engine assigns target IDs for limbo document detection.
    return new TargetIdGenerator(GeneratorIds.SyncEngine);
  }
}
