/**
 * Copyright 2018 Google Inc.
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

import { BatchId, MutationBatchState } from '../core/types';
import { FirestoreError } from '../util/error';
import { ClientId } from './shared_client_state';

/**
 * An interface that describes the actions the SharedClientState class needs to
 * perform on a cooperating synchronization engine.
 */
export interface SharedClientStateSyncer {
  /** Applies a mutation state to an existing batch.  */
  applyBatchState(
    batchId: BatchId,
    state: MutationBatchState,
    error?: FirestoreError
  ): Promise<void>;

  /** Returns the IDs of the clients that are currently active. */
  getActiveClients(): Promise<ClientId[]>;
}
