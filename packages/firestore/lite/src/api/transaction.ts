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

import {
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs,
  UserDataReader
} from '../../../src/api/user_data_reader';
import { Transaction as InternalTransaction } from '../../../src/core/transaction';
import {
  Document,
  MaybeDocument,
  NoDocument
} from '../../../src/model/document';
import { fail } from '../../../src/util/assert';
import { applyFirestoreDataConverter } from '../../../src/api/database';
import { DocumentSnapshot } from './snapshot';
import { FirebaseFirestore } from './database';
import { TransactionRunner } from '../../../src/core/transaction_runner';
import { AsyncQueue } from '../../../src/util/async_queue';
import { Deferred } from '../../../src/util/promise';
import { validateReference } from './write_batch';
import {
  DocumentReference,
  newUserDataReader,
  SetOptions,
  UpdateData
} from './reference';
import { FieldPath } from './field_path';
import { cast } from './util';
import { getDatastore } from './components';

// TODO(mrschmidt) Consider using `BaseTransaction` as the base class in the
// legacy SDK.
export class Transaction {
  // This is the tree-shakeable version of the Transaction class used in the
  // legacy SDK. The class is a close copy but takes different input and output
  // types. The firestore-exp SDK further extends this class to return its API
  // type.

  private readonly _dataReader: UserDataReader;

  constructor(
    protected readonly _firestore: FirebaseFirestore,
    private readonly _transaction: InternalTransaction
  ) {
    this._dataReader = newUserDataReader(_firestore);
  }

  get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
    const ref = validateReference(documentRef, this._firestore);
    return this._transaction
      .lookup([ref._key])
      .then((docs: MaybeDocument[]) => {
        if (!docs || docs.length !== 1) {
          return fail('Mismatch in docs returned from document lookup.');
        }
        const doc = docs[0];
        if (doc instanceof NoDocument) {
          return new DocumentSnapshot(
            this._firestore,
            ref._key,
            null,
            ref._converter
          );
        } else if (doc instanceof Document) {
          return new DocumentSnapshot(
            this._firestore,
            doc.key,
            doc,
            ref._converter
          );
        } else {
          throw fail(
            `BatchGetDocumentsRequest returned unexpected document type: ${doc.constructor.name}`
          );
        }
      });
  }

  set<T>(documentRef: DocumentReference<T>, value: T): this;
  set<T>(
    documentRef: DocumentReference<T>,
    value: Partial<T>,
    options: SetOptions
  ): this;
  set<T>(
    documentRef: DocumentReference<T>,
    value: T,
    options?: SetOptions
  ): this {
    const ref = validateReference(documentRef, this._firestore);
    const convertedValue = applyFirestoreDataConverter(
      ref._converter,
      value,
      options
    );
    const parsed = parseSetData(
      this._dataReader,
      'Transaction.set',
      ref._key,
      convertedValue,
      ref._converter !== null,
      options
    );
    this._transaction.set(ref._key, parsed);
    return this;
  }

  update(documentRef: DocumentReference<unknown>, value: UpdateData): this;
  update(
    documentRef: DocumentReference<unknown>,
    field: string | FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): this;
  update(
    documentRef: DocumentReference<unknown>,
    fieldOrUpdateData: string | FieldPath | UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): this {
    const ref = validateReference(documentRef, this._firestore);

    let parsed;
    if (
      typeof fieldOrUpdateData === 'string' ||
      fieldOrUpdateData instanceof FieldPath
    ) {
      parsed = parseUpdateVarargs(
        this._dataReader,
        'Transaction.update',
        ref._key,
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      parsed = parseUpdateData(
        this._dataReader,
        'Transaction.update',
        ref._key,
        fieldOrUpdateData
      );
    }

    this._transaction.update(ref._key, parsed);
    return this;
  }

  delete(documentRef: DocumentReference<unknown>): this {
    const ref = validateReference(documentRef, this._firestore);
    this._transaction.delete(ref._key);
    return this;
  }
}

export function runTransaction<T>(
  firestore: FirebaseFirestore,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T> {
  const firestoreClient = cast(firestore, FirebaseFirestore);
  const datastore = getDatastore(firestoreClient);
  const deferred = new Deferred<T>();
  new TransactionRunner<T>(
    new AsyncQueue(),
    datastore,
    internalTransaction =>
      updateFunction(new Transaction(firestoreClient, internalTransaction)),
    deferred
  ).run();
  return deferred.promise;
}
