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

import { DocumentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';

import { GarbageSource } from './garbage_source';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';

/**
 * Tracks different kinds of references to a document, for all the different
 * ways the client needs to retain a document.
 *
 * Usually the the local store this means tracking of three different types of
 * references to a document:
 *  - RemoteTarget reference identified by a target ID.
 *  - LocalView reference identified also by a target ID.
 *  - Local mutation reference identified by a batch ID.
 *
 * The idea is that we want to keep a document around at least as long as any
 * remote target or local (latency compensated) view is referencing it, or
 * there's an outstanding local mutation to that document.
 */
export interface GarbageCollector {
  /**
   * A property that describes whether or not the collector wants to eagerly
   * collect keys.
   *
   * TODO(b/33384523) Delegate deleting released queries to the GC. This flag
   * is a temporary workaround for dealing with a persistent query cache.
   * The collector really should have an API for releasing queries that does
   * the right thing for its policy.
   */
  readonly isEager: boolean;

  /** Adds a garbage source to the collector. */
  addGarbageSource(garbageSource: GarbageSource): void;

  /** Removes a garbage source from the collector. */
  removeGarbageSource(garbageSource: GarbageSource): void;

  /**
   * Notifies the garbage collector that a document with the given key may have
   * become garbage.
   *
   * This is useful in both when a document has definitely been released (for
   * example when removed from a garbage source) but also when a document has
   * been updated. Documents should be marked in this way because the client
   * accepts updates for the documents even after the document no longer
   * matches any active targets. This behavior allows the client to avoid
   * re-showing an old document in the next latency-compensated view.
   */
  addPotentialGarbageKey(key: DocumentKey): void;

  /**
   * Returns the contents of the garbage bin and clears it.
   *
   * @param transaction The persistence transaction used to collect garbage. Can
   * be null if all garbage sources are non-persistent (and therefore ignore the
   * transaction completely).
   */
  collectGarbage(
    transaction: PersistenceTransaction | null
  ): PersistencePromise<DocumentKeySet>;
}
