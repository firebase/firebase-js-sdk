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
 * A garbage collector implementation that does absolutely nothing. It ignores
 * all addGarbageSource and addPotentialGarbageKey messages and and never
 * produces any garbage.
 */
export class NoOpGarbageCollector implements GarbageCollector {
  readonly isEager = false;

  addGarbageSource(garbageSource: GarbageSource): void {
    // Not tracking garbage so don't track sources.
  }

  removeGarbageSource(garbageSource: GarbageSource): void {
    // Not tracking garbage so don't track sources.
  }

  addPotentialGarbageKey(key: DocumentKey): void {
    // Not tracking garbage so ignore.
  }

  collectGarbage(
    txn: PersistenceTransaction | null
  ): PersistencePromise<DocumentKeySet> {
    return PersistencePromise.resolve(documentKeySet());
  }
}
