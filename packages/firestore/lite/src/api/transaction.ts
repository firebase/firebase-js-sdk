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
import { getDatastore } from './components';

// TODO(mrschmidt) Consider using `BaseTransaction` as the base class in the
// legacy SDK.

/**
 * A reference to a transaction.
 *
 * The `Transaction` object passed to a transaction's updateFunction provides
 * the methods to read and write data within the transaction context. See
 * {@link runTransaction()}.
 */
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

  /**
   * Reads the document referenced by the provided {@link DocumentReference}.
   *
   * @param documentRef A reference to the document to be read.
   * @return A DocumentSnapshot for the read data.
   */
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

  /**
   * Writes to the document referred to by the provided {@link
   * DocumentReference}. If the document does not exist yet, it will be created.
   *
   * @param documentRef A reference to the document to be set.
   * @param data An object of the fields and values for the document.\
   * @return This `Transaction` instance. Used for chaining method calls.
   */
  set<T>(documentRef: DocumentReference<T>, data: T): this;
  /**
   * Writes to the document referred to by the provided {@link
   * DocumentReference}. If the document does not exist yet, it will be created.
   * If you provide `merge` or `mergeFields`, the provided data can be merged
   * into an existing document.
   *
   * @param documentRef A reference to the document to be set.
   * @param data An object of the fields and values for the document.
   * @return This `Transaction` instance. Used for chaining method calls.
   */
  set<T>(documentRef: DocumentReference<T>, data: Partial<T>): this;
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

  /**
   * Updates fields in the document referred to by the provided {@link
   * DocumentReference}. The update will fail if applied to a document that does
   * not exist.
   *
   * @param documentRef A reference to the document to be updated.
   * @param data An object containing the fields and values with which to
   * update the document. Fields can contain dots to reference nested fields
   * within the document.
   * @return This `Transaction` instance. Used for chaining method calls.
   */
  update(documentRef: DocumentReference<unknown>, data: UpdateData): this;
  /**
   * Updates fields in the document referred to by the provided {@link
   * DocumentReference}. The update will fail if applied to a document that does
   * not exist.
   *
   * Nested fields can be updated by providing dot-separated field path
   * strings or by providing FieldPath objects.
   *
   * @param documentRef A reference to the document to be updated.
   * @param field The first field to update.
   * @param value The first value.
   * @param moreFieldsAndValues Additional key/value pairs.
   * @return A Promise resolved once the data has been successfully written
   * to the backend (Note that it won't resolve while you're offline).
   */
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

  /**
   * Deletes the document referred to by the provided {@link DocumentReference}.
   *
   * @param documentRef A reference to the document to be deleted.
   * @return This `Transaction` instance. Used for chaining method calls.
   */
  delete(documentRef: DocumentReference<unknown>): this {
    const ref = validateReference(documentRef, this._firestore);
    this._transaction.delete(ref._key);
    return this;
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
 * @return  If the transaction completed successfully or was explicitly aborted
 * (the `updateFunction` returned a failed promise), the promise returned by the
 * updateFunction is returned here. Else, if the transaction failed, a rejected
 * promise with the corresponding failure error will be returned.
 */
export function runTransaction<T>(
  firestore: FirebaseFirestore,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T> {
  const datastore = getDatastore(firestore);
  const deferred = new Deferred<T>();
  new TransactionRunner<T>(
    new AsyncQueue(),
    datastore,
    internalTransaction =>
      updateFunction(new Transaction(firestore, internalTransaction)),
    deferred
  ).run();
  return deferred.promise;
}
