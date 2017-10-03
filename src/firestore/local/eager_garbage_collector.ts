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

import { DocumentKeySet, documentKeySet } from '../model/collections';
import { DocumentKey } from '../model/document_key';
import { PromiseImpl as Promise } from '../../utils/promise';

import { GarbageCollector } from './garbage_collector';
import { GarbageSource } from './garbage_source';
import { PersistenceTransaction } from './persistence';
import { PersistencePromise } from './persistence_promise';

/**
 * A garbage collector implementation that eagerly collects documents as soon as
 * they're no longer referenced in any of its registered GarbageSources.
 *
 * This implementation keeps track of a set of keys that are potentially garbage
 * without keeping an exact reference count. During collectGarbage, the
 * collector verifies that all potential garbage keys actually have no
 * references by consulting its list of garbage sources.
 */
export class EagerGarbageCollector implements GarbageCollector {
  readonly isEager = true;

  /**
   * The garbage collectible sources to double-check during garbage collection.
   */
  private sources: GarbageSource[] = [];

  /**
   * A set of potentially garbage keys.
   * PORTING NOTE: This would be a mutable set if Javascript had one.
   */
  private potentialGarbage: DocumentKeySet = documentKeySet();

  addGarbageSource(garbageSource: GarbageSource): void {
    this.sources.push(garbageSource);
    garbageSource.setGarbageCollector(this);
  }

  removeGarbageSource(garbageSource: GarbageSource): void {
    this.sources.splice(this.sources.indexOf(garbageSource), 1);
    garbageSource.setGarbageCollector(null);
  }

  addPotentialGarbageKey(key: DocumentKey): void {
    this.potentialGarbage = this.potentialGarbage.add(key);
  }

  collectGarbage(
    txn: PersistenceTransaction | null
  ): PersistencePromise<DocumentKeySet> {
    const promises: Array<PersistencePromise<void>> = [];
    let garbageKeys = documentKeySet();

    this.potentialGarbage.forEach(key => {
      const hasRefsPromise = this.documentHasAnyReferences(txn, key);
      promises.push(
        hasRefsPromise.next(hasRefs => {
          // If there are no references, get the key.
          if (!hasRefs) {
            garbageKeys = garbageKeys.add(key);
          }
          return PersistencePromise.resolve();
        })
      );
    });

    // Clear locally retained potential keys and returned confirmed garbage.
    this.potentialGarbage = documentKeySet();
    return PersistencePromise.waitFor(promises).next(() => garbageKeys);
  }

  documentHasAnyReferences(
    txn: PersistenceTransaction | null,
    key: DocumentKey
  ): PersistencePromise<boolean> {
    const initial = PersistencePromise.resolve(false);
    return this.sources
      .map(source => () => source.containsKey(txn, key))
      .reduce<PersistencePromise<boolean>>((promise, nextPromise) => {
        return promise.next(result => {
          if (result) {
            return PersistencePromise.resolve(true);
          } else {
            return nextPromise();
          }
        });
      }, initial);
  }
}
