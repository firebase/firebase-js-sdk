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

import { TargetId } from './types';

/** Offset to ensure non-overlapping target ids. */
const OFFSET = 2;

/**
 * Generates monotonically increasing target IDs for sending targets to the
 * watch stream.
 *
 * The client constructs two generators, one for the target cache, and one for
 * for the sync engine (to generate limbo documents targets). These
 * generators produce non-overlapping IDs (by using even and odd IDs
 * respectively).
 *
 * By separating the target ID space, the query cache can generate target IDs
 * that persist across client restarts, while sync engine can independently
 * generate in-memory target IDs that are transient and can be reused after a
 * restart.
 */
export class TargetIdGenerator {
  constructor(private lastId: number) {}

  next(): TargetId {
    this.lastId += OFFSET;
    return this.lastId;
  }

  static forTargetCache(): TargetIdGenerator {
    // The target cache generator must return '2' in its first call to `next()`
    // as there is no differentiation in the protocol layer between an unset
    // number and the number '0'. If we were to sent a target with target ID
    // '0', the backend would consider it unset and replace it with its own ID.
    return new TargetIdGenerator(2 - OFFSET);
  }

  static forSyncEngine(): TargetIdGenerator {
    // Sync engine assigns target IDs for limbo document detection.
    return new TargetIdGenerator(1 - OFFSET);
  }
}
