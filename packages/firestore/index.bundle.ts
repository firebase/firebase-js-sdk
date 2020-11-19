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

import { Firestore } from './src/api/database';
import { loadBundle, namedQuery } from './src/api/bundle';

/**
 * Registers the memory-only Firestore build with the components framework.
 */
export function registerBundle(instance: typeof Firestore): void {
  instance.prototype.loadBundle = function (
    data: ArrayBuffer | ReadableStream<Uint8Array> | string
  ) {
    return loadBundle(this as any, data);
  };
  instance.prototype.namedQuery = function (queryName: string) {
    return namedQuery(this as any, queryName);
  };

  //TODO: add loadBundle and namedQuery to the firestore namespace
}

registerBundle(Firestore);
