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

import * as firestore from '../../index';

import { BaseTransaction } from '../../../lite/src/api/transaction';
import { DocumentSnapshot } from './snapshot';
import { TransactionRunner } from '../../../src/core/transaction_runner';
import { AsyncQueue } from '../../../src/util/async_queue';
import { cast } from '../../../lite/src/api/util';
import { Firestore } from './database';
import { Deferred } from '../../../src/util/promise';
import { SnapshotMetadata } from '../../../src/api/database';
import { Transaction as InternalTransaction } from '../../../src/core/transaction';

export class Transaction extends BaseTransaction
  implements firestore.Transaction {
  constructor(
    protected readonly _firestore: Firestore,
    _transaction: InternalTransaction
  ) {
    super(_firestore, _transaction);
  }

  get<T>(
    documentRef: firestore.DocumentReference<T>
  ): Promise<firestore.DocumentSnapshot<T>> {
    return this._getHelper<firestore.DocumentSnapshot<T>, T>(
      documentRef,
      (ref, doc) =>
        new DocumentSnapshot<T>(
          this._firestore,
          ref._key,
          doc,
          new SnapshotMetadata(
            /* hasPendingWrites= */ false,
            /* fromCache= */ false
          ),
          ref._converter
        )
    );
  }
}

export function runTransaction<T>(
  firestore: firestore.FirebaseFirestore,
  updateFunction: (transaction: firestore.Transaction) => Promise<T>
): Promise<T> {
  const firestoreClient = cast(firestore, Firestore);
  return firestoreClient._getDatastore().then(async datastore => {
    const deferred = new Deferred<T>();
    new TransactionRunner<T>(
      new AsyncQueue(),
      datastore,
      internalTransaction =>
        updateFunction(new Transaction(firestoreClient, internalTransaction)),
      deferred
    ).run();
    return deferred.promise;
  });
}
