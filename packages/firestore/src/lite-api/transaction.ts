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

import { getModularInstance } from '@firebase/util';

import { Transaction as InternalTransaction } from '../core/transaction';
import {
  DEFAULT_TRANSACTION_OPTIONS,
  TransactionOptions as TranasactionOptionsInternal,
  validateTransactionOptions
} from '../core/transaction_options';
import { TransactionRunner } from '../core/transaction_runner';
import { fail } from '../util/assert';
import { newAsyncQueue } from '../util/async_queue_impl';
import { cast } from '../util/input_validation';
import { Deferred } from '../util/promise';

import { getDatastore } from './components';
import { Firestore } from './database';
import { FieldPath } from './field_path';
import {
  DocumentData,
  DocumentReference,
  PartialWithFieldValue,
  SetOptions,
  UpdateData,
  WithFieldValue
} from './reference';
import {
  applyFirestoreDataConverter,
  LiteUserDataWriter
} from './reference_impl';
import { DocumentSnapshot } from './snapshot';
import { TransactionOptions } from './transaction_options';
import {
  newUserDataReader,
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs,
  UserDataReader
} from './user_data_reader';
import { validateReference } from './write_batch';

// TODO(mrschmidt) Consider using `BaseTransaction` as the base class in the
// legacy SDK.

/**
 * A reference to a transaction.
 *
 * The `Transaction` object passed to a transaction's `updateFunction` provides
 * the methods to read and write data within the transaction context. See
 * {@link runTransaction}.
 */
export class Transaction {
  // This is the tree-shakeable version of the Transaction class used in the
  // legacy SDK. The class is a close copy but takes different input and output
  // types. The firestore-exp SDK further extends this class to return its API
  // type.

  private readonly _dataReader: UserDataReader;

  /** @hideconstructor */
  constructor(
    protected readonly _firestore: Firestore,
    private readonly _transaction: InternalTransaction
  ) {
    this._dataReader = newUserDataReader(_firestore);
  }

  /**
   * Reads the document referenced by the provided {@link DocumentReference}.
   *
   * @param documentRef - A reference to the document to be read.
   * @returns A `DocumentSnapshot` with the read data.
   */
  get<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>
  ): Promise<DocumentSnapshot<AppModelType, DbModelType>> {
    const ref = validateReference(documentRef, this._firestore);
    const userDataWriter = new LiteUserDataWriter(this._firestore);
    return this._transaction.lookup([ref._key]).then(docs => {
      if (!docs || docs.length !== 1) {
        return fail('Mismatch in docs returned from document lookup.');
      }
      const doc = docs[0];
      if (doc.isFoundDocument()) {
        return new DocumentSnapshot<AppModelType, DbModelType>(
          this._firestore,
          userDataWriter,
          doc.key,
          doc,
          ref.converter
        );
      } else if (doc.isNoDocument()) {
        return new DocumentSnapshot<AppModelType, DbModelType>(
          this._firestore,
          userDataWriter,
          ref._key,
          null,
          ref.converter
        );
      } else {
        throw fail(
          `BatchGetDocumentsRequest returned unexpected document: ${doc}`
        );
      }
    });
  }

  /**
   * Writes to the document referred to by the provided {@link
   * DocumentReference}. If the document does not exist yet, it will be created.
   *
   * @param documentRef - A reference to the document to be set.
   * @param data - An object of the fields and values for the document.
   * @throws Error - If the provided input is not a valid Firestore document.
   * @returns This `Transaction` instance. Used for chaining method calls.
   */
  set<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    data: WithFieldValue<AppModelType>
  ): this;
  /**
   * Writes to the document referred to by the provided {@link
   * DocumentReference}. If the document does not exist yet, it will be created.
   * If you provide `merge` or `mergeFields`, the provided data can be merged
   * into an existing document.
   *
   * @param documentRef - A reference to the document to be set.
   * @param data - An object of the fields and values for the document.
   * @param options - An object to configure the set behavior.
   * @throws Error - If the provided input is not a valid Firestore document.
   * @returns This `Transaction` instance. Used for chaining method calls.
   */
  set<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    data: PartialWithFieldValue<AppModelType>,
    options: SetOptions
  ): this;
  set<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    value: PartialWithFieldValue<AppModelType>,
    options?: SetOptions
  ): this {
    const ref = validateReference(documentRef, this._firestore);
    const convertedValue = applyFirestoreDataConverter(
      ref.converter,
      value,
      options
    );
    const parsed = parseSetData(
      this._dataReader,
      'Transaction.set',
      ref._key,
      convertedValue,
      ref.converter !== null,
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
   * @param documentRef - A reference to the document to be updated.
   * @param data - An object containing the fields and values with which to
   * update the document. Fields can contain dots to reference nested fields
   * within the document.
   * @throws Error - If the provided input is not valid Firestore data.
   * @returns This `Transaction` instance. Used for chaining method calls.
   */
  update<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    data: UpdateData<DbModelType>
  ): this;
  /**
   * Updates fields in the document referred to by the provided {@link
   * DocumentReference}. The update will fail if applied to a document that does
   * not exist.
   *
   * Nested fields can be updated by providing dot-separated field path
   * strings or by providing `FieldPath` objects.
   *
   * @param documentRef - A reference to the document to be updated.
   * @param field - The first field to update.
   * @param value - The first value.
   * @param moreFieldsAndValues - Additional key/value pairs.
   * @throws Error - If the provided input is not valid Firestore data.
   * @returns This `Transaction` instance. Used for chaining method calls.
   */
  update<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    field: string | FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): this;
  update<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>,
    fieldOrUpdateData: string | FieldPath | UpdateData<DbModelType>,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): this {
    const ref = validateReference(documentRef, this._firestore);

    // For Compat types, we have to "extract" the underlying types before
    // performing validation.
    fieldOrUpdateData = getModularInstance(fieldOrUpdateData);

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
   * @param documentRef - A reference to the document to be deleted.
   * @returns This `Transaction` instance. Used for chaining method calls.
   */
  delete<AppModelType, DbModelType extends DocumentData>(
    documentRef: DocumentReference<AppModelType, DbModelType>
  ): this {
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
 * @param firestore - A reference to the Firestore database to run this
 * transaction against.
 * @param updateFunction - The function to execute within the transaction
 * context.
 * @param options - An options object to configure maximum number of attempts to
 * commit.
 * @returns If the transaction completed successfully or was explicitly aborted
 * (the `updateFunction` returned a failed promise), the promise returned by the
 * `updateFunction `is returned here. Otherwise, if the transaction failed, a
 * rejected promise with the corresponding failure error is returned.
 */
export function runTransaction<T>(
  firestore: Firestore,
  updateFunction: (transaction: Transaction) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  firestore = cast(firestore, Firestore);
  const datastore = getDatastore(firestore);
  const optionsWithDefaults: TranasactionOptionsInternal = {
    ...DEFAULT_TRANSACTION_OPTIONS,
    ...options
  };
  validateTransactionOptions(optionsWithDefaults);
  const deferred = new Deferred<T>();
  new TransactionRunner<T>(
    newAsyncQueue(),
    datastore,
    optionsWithDefaults,
    internalTransaction =>
      updateFunction(new Transaction(firestore, internalTransaction)),
    deferred
  ).run();
  return deferred.promise;
}
