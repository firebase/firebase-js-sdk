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

import { WriteBatch } from '../../../lite/src/api/write_batch';
import { FirebaseFirestore } from './database';
import { executeWrite } from './reference';

/**
 * Creates a write batch, used for performing multiple writes as a single
 * atomic operation. The maximum number of writes allowed in a single WriteBatch
 * is 500.
 *
 * Unlike transactions, write batches are persisted offline and therefore are
 * preferable when you don't need to condition your writes on read data.
 *
 * @return A `WriteBatch` that can be used to atomically execute multiple
 * writes.
 */
export function writeBatch(firestore: FirebaseFirestore): WriteBatch {
  firestore._verifyNotTerminated();
  return new WriteBatch(firestore, mutations =>
    executeWrite(firestore, mutations)
  );
}
