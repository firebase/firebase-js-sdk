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

import { Code, FirestoreError } from '../util/error';
import { logDebug } from '../util/log';
import { LruGarbageCollector, LruResults } from './lru_garbage_collector';
import { PRIMARY_LEASE_LOST_ERROR_MSG } from './persistence_transaction';

/**
 * Local storage in the Firestore client. Coordinates persistence components
 * like the mutation queue and remote document cache to present a
 * latency-compensated view of stored data.
 *
 * The LocalStore is responsible for accepting mutations from the Sync Engine.
 * Writes from the client are put into a queue as provisional Mutations until
 * they are processed by the RemoteStore and confirmed as having been written
 * to the server.
 *
 * The local store provides the local version of documents that have been
 * modified locally. It maintains the constraint:
 *
 *   LocalDocument = RemoteDocument + Active(LocalMutations)
 *
 * (Active mutations are those that are enqueued and have not been previously
 * acknowledged or rejected).
 *
 * The RemoteDocument ("ground truth") state is provided via the
 * applyChangeBatch method. It will be some version of a server-provided
 * document OR will be a server-provided document PLUS acknowledged mutations:
 *
 *   RemoteDocument' = RemoteDocument + Acknowledged(LocalMutations)
 *
 * Note that this "dirty" version of a RemoteDocument will not be identical to a
 * server base version, since it has LocalMutations added to it pending getting
 * an authoritative copy from the server.
 *
 * Since LocalMutations can be rejected by the server, we have to be able to
 * revert a LocalMutation that has already been applied to the LocalDocument
 * (typically done by replaying all remaining LocalMutations to the
 * RemoteDocument to re-apply).
 *
 * The LocalStore is responsible for the garbage collection of the documents it
 * contains. For now, it every doc referenced by a view, the mutation queue, or
 * the RemoteStore.
 *
 * It also maintains the persistence of mapping queries to resume tokens and
 * target ids. It needs to know this data about queries to properly know what
 * docs it would be allowed to garbage collect.
 *
 * The LocalStore must be able to efficiently execute queries against its local
 * cache of the documents, to provide the initial set of results before any
 * remote changes have been received.
 *
 * Note: In TypeScript, most methods return Promises since the implementation
 * may rely on fetching data from IndexedDB which is async.
 * These Promises will only be rejected on an I/O error or other internal
 * (unexpected) failure (e.g. failed assert) and always represent an
 * unrecoverable error (should be caught / reported by the async_queue).
 *
 * This interface retains one method to help TypeScript narrow down the type.
 * All other methods are free functions.
 */
export interface LocalStore {
  collectGarbage(garbageCollector: LruGarbageCollector): Promise<LruResults>;
}

/**
 * Verifies the error thrown by a LocalStore operation. If a LocalStore
 * operation fails because the primary lease has been taken by another client,
 * we ignore the error (the persistence layer will immediately call
 * `applyPrimaryLease` to propagate the primary state change). All other errors
 * are re-thrown.
 *
 * @param err - An error returned by a LocalStore operation.
 * @returns A Promise that resolves after we recovered, or the original error.
 */
export async function ignoreIfPrimaryLeaseLoss(
  err: FirestoreError
): Promise<void> {
  if (
    err.code === Code.FAILED_PRECONDITION &&
    err.message === PRIMARY_LEASE_LOST_ERROR_MSG
  ) {
    logDebug('LocalStore', 'Unexpectedly lost primary lease');
  } else {
    throw err;
  }
}
