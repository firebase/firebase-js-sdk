/**
 * @license
 * Copyright 2024 Google LLC
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

import { ByteString } from '../util/byte_string';

import { PersistencePromise } from './persistence_promise';
import { PersistenceTransaction } from './persistence_transaction';

/**
 * General purpose cache for global values.
 *
 * Global state that cuts across components should be saved here. Following are contained herein:
 *
 * `sessionToken` tracks server interaction across Listen and Write streams. This facilitates cache
 * synchronization and invalidation.
 */
export interface GlobalsCache {
  /**
   * Gets session token.
   */
  getSessionToken(
    transaction: PersistenceTransaction
  ): PersistencePromise<ByteString>;

  /**
   * Sets session token.
   *
   * @param sessionToken - The new session token.
   */
  setSessionToken(
    transaction: PersistenceTransaction,
    sessionToken: ByteString
  ): PersistencePromise<void>;
}
