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

import { TargetId } from '../core/types';
import { DocumentKeySet } from '../model/collections';
import { User } from '../auth/user';

/**
 * An interface that describes the actions the RemoteStore needs to perform on
 * a cooperating synchronization engine.
 */
export interface RemoteSyncer {

  /**
   * Returns the set of remote document keys for the given target ID. This list
   * includes the documents that were assigned to the target when we received
   * the last snapshot.
   */
  getRemoteKeysForTarget(targetId: TargetId): DocumentKeySet;

  /**
   * Updates all local state to match the pending mutations for the given user.
   * May be called repeatedly for the same user.
   */
  handleCredentialChange(user: User): Promise<void>;
}
