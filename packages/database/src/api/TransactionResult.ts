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

import { DataSnapshot } from './DataSnapshot';
import { validateArgCount } from '@firebase/util';

export class TransactionResult {
  /**
   * A type for the resolve value of Firebase.transaction.
   * @constructor
   * @dict
   * @param {boolean} committed
   * @param {DataSnapshot} snapshot
   */
  constructor(public committed: boolean, public snapshot: DataSnapshot) {}

  // Do not create public documentation. This is intended to make JSON serialization work but is otherwise unnecessary
  // for end-users
  toJSON(): object {
    validateArgCount('TransactionResult.toJSON', 0, 1, arguments.length);
    return { committed: this.committed, snapshot: this.snapshot.toJSON() };
  }
}
