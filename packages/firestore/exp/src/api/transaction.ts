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

import { Transaction as LiteTransaction } from '../../../lite/src/api/transaction';
import { DocumentSnapshot } from './snapshot';
import { TransactionRunner } from '../../../src/core/transaction_runner';
import { AsyncQueue } from '../../../src/util/async_queue';
import { FirebaseFirestore } from './database';
import { Deferred } from '../../../src/util/promise';
import {
  ensureFirestoreConfigured,
  SnapshotMetadata
} from '../../../src/api/database';
import { Transaction as InternalTransaction } from '../../../src/core/transaction';
import { validateReference } from '../../../lite/src/api/write_batch';
import { getDatastore } from '../../../lite/src/api/components';
import { DocumentReference } from '../../../lite/src/api/reference';

/**
 * A reference to a transaction.
 *
 * The `Transaction` object passed to a transaction's `updateFunction` provides
 * the methods to read and write data within the transaction context. See
 * {@link runTransaction()}.
 */
export class Transaction extends LiteTransaction {
  // This class implements the same logic as the Transaction API in the Lite SDK
  // but is subclassed in order to return its own DocumentSnapshot types.

  constructor(
    protected readonly _firestore: FirebaseFirestore,
    _transaction: InternalTransaction
  ) {
    super(_firestore, _transaction);
  }

  /**
   * Reads the document referenced by the provided {@link DocumentReference}.
   *
   * @param documentRef A reference to the document to be read.
   * @return A `DocumentSnapshot` with the read data.
   */
  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
    const ref = validateReference<T>(documentRef, this._firestore);
    return super
      .get(documentRef)
      .then(
        liteDocumentSnapshot =>
          new DocumentSnapshot(
            this._firestore,
            ref._key,
            liteDocumentSnapshot._document,
            new SnapshotMetadata(
              /* hasPendingWrites= */ false,
              /* fromCache= */ false
            ),
            ref._converter
          )
      );
  }
}

/**
 * Executes the given `updateFunction` and then attempts to commit the changes
 * applied within the transaction. If any document read within the transaction
 * has changed, Cloud Firestore retries the `updateFunction`. If it fails to
 * commit after 5 attempts, the transaction fails.
 *
 * The maximum number of writes allowed in a single transaction is 500.
 *
 * @param firestore A reference to the Firestore database to run this
 * transaction against.
 * @param updateFunction The function to execute within the transaction context.
 * @return If the transaction completed successfully or was explicitly aborted
 * (the `updateFunction` returned a failed promise), the promise returned by the
 * `updateFunction `is returned here. Otherwise, if the transaction failed, a
 * rejected promise with the corresponding failure error is returned.
 */
export function runTransaction<T>(
  firestore: FirebaseFirestore,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T> {
  ensureFirestoreConfigured(firestore);

  const deferred = new Deferred<T>();
  firestore._queue.enqueueAndForget(async () => {
    const datastore = await getDatastore(firestore);
    new TransactionRunner<T>(
      new AsyncQueue(),
      datastore,
      internalTransaction =>
        updateFunction(new Transaction(firestore, internalTransaction)),
      deferred
    ).run();
  });
  return deferred.promise;
}
