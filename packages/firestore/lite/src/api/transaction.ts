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

import * as firestore from '../../';

import { UserDataReader } from '../../../src/api/user_data_reader';
import { Transaction as InternalTransaction } from '../../../src/core/transaction';
import {
  Document,
  MaybeDocument,
  NoDocument
} from '../../../src/model/document';
import { fail } from '../../../src/util/assert';
import {
  TransactionWriter,
  validateReference
} from '../../../src/api/database';
import { DocumentSnapshot } from './snapshot';
import { Firestore } from './database';
import { TransactionRunner } from '../../../src/core/transaction_runner';
import { AsyncQueue } from '../../../src/util/async_queue';
import { Deferred } from '../../../src/util/promise';

export class Transaction extends TransactionWriter
  implements firestore.Transaction {
  constructor(
    protected _firestore: Firestore,
    _dataReader: UserDataReader,
    _transaction: InternalTransaction
  ) {
    super(_firestore, _dataReader, _transaction);
  }

  get<T>(
    documentRef: firestore.DocumentReference<T>
  ): Promise<DocumentSnapshot<T>> {
    const ref = validateReference<T>(
      'Transaction.get',
      documentRef,
      this._firestore
    );
    return this._transaction
      .lookup([ref._key])
      .then((docs: MaybeDocument[]) => {
        if (!docs || docs.length !== 1) {
          return fail('Mismatch in docs returned from document lookup.');
        }
        const doc = docs[0];
        if (doc instanceof NoDocument) {
          return new DocumentSnapshot<T>(this._firestore, ref._key, null);
        } else if (doc instanceof Document) {
          return new DocumentSnapshot<T>(this._firestore, doc.key, doc);
        } else {
          throw fail(
            `BatchGetDocumentsRequest returned unexpected document type: ${doc.constructor.name}`
          );
        }
      });
  }
}

export function runTransaction<T>(
  firestore: Firestore,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T> {
  return firestore._getDatastore().then(async datastore => {
    const deferred = new Deferred<T>();
    const internalTransaction = new InternalTransaction(datastore);
    new TransactionRunner<T>(
      new AsyncQueue(),
      datastore,
      () =>
        updateFunction(
          new Transaction(firestore, firestore._dataReader, internalTransaction)
        ),
      deferred
    ).run();
    return deferred.promise;
  });
}
