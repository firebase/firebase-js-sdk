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

import { Firestore, loadBundle, namedQuery } from './export';

/**
 * Prototype patches bundle loading to Firestore.
 */
export function registerBundle(instance: typeof Firestore): void {
  instance.prototype.loadBundle = function (
    this: Firestore,
    data: ArrayBuffer | ReadableStream<Uint8Array> | string
  ) {
    return loadBundle(this, data);
  };
  instance.prototype.namedQuery = function (
    this: Firestore,
    queryName: string
  ) {
    return namedQuery(this, queryName);
  };

  //TODO: add loadBundle and namedQuery to the firestore namespace
}

registerBundle(Firestore);
