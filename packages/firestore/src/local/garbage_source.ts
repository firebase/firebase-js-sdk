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

import { DocumentKey } from '../model/document_key';

import { GarbageCollector } from './garbage_collector';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';

/**
 * A pseudo-collection that maintains references to documents. GarbageSource
 * collections notify the GarbageCollector when references to documents change
 * through the GarbageCollector.addPotentialGarbageKey method.
 */
export interface GarbageSource {
  /**
   * Sets the garbage collector to which this collection should send
   * addPotentialGarbageKey messages.
   */
  setGarbageCollector(gc: GarbageCollector | null): void;

  /**
   * Checks to see if there are any references to a document with the given key.
   * This can be used by garbage collectors to double-check if a key exists in
   * this collection when it was released elsewhere.
   *
   * PORTING NODE: This is used in contexts where PersistenceTransaction is
   * known not to be needed, in this case we just pass in null. Therefore
   * any implementations must gaurd against null values.
   */
  containsKey(
    transaction: PersistenceTransaction | null,
    key: DocumentKey
  ): PersistencePromise<boolean>;
}
