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

import {
  DocumentKeyReference,
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
import { Firestore } from './database';
import { TransactionRunner } from '../../../src/core/transaction_runner';
import { AsyncQueue } from '../../../src/util/async_queue';
import { Deferred } from '../../../src/util/promise';
import { FieldPath as ExternalFieldPath } from '../../../src/api/field_path';
import { validateReference } from './write_batch';
import { DocumentReference, newUserDataReader } from './reference';
import { FieldPath } from './field_path';
import { cast } from './util';
import { DocumentKey } from '../../../src/model/document_key';

// TODO(firestoreexp): Consider using this as the base class for the legacy Transaction API
export abstract class BaseTransaction {
  // This is the lite version of the Transaction API used in the legacy SDK. The
  // class is a close copy but takes different input types.

  private readonly _dataReader: UserDataReader;

  constructor(
    protected readonly _firestore: Firestore,
    private readonly _transaction: InternalTransaction
  ) {
    this._dataReader = newUserDataReader(_firestore);
  }

  protected _getHelper<DocSnap, T>(
    documentRef: firestore.DocumentReference<unknown>,
    converter: (ref: DocumentReference<T>, doc: Document | null) => DocSnap
  ): Promise<DocSnap> {
    const ref = validateReference(documentRef, this._firestore);
    return this._transaction
      .lookup([ref._key])
      .then((docs: MaybeDocument[]) => {
        if (!docs || docs.length !== 1) {
          return fail('Mismatch in docs returned from document lookup.');
        }
        const doc = docs[0];
        if (doc instanceof NoDocument) {
          return converter(ref, null);
        } else if (doc instanceof Document) {
          return converter(ref, doc);
        } else {
          throw fail(
            `BatchGetDocumentsRequest returned unexpected document type: ${doc.constructor.name}`
          );
        }
      });
  }

  set<T>(documentRef: firestore.DocumentReference<T>, value: T): this;
  set<T>(
    documentRef: firestore.DocumentReference<T>,
    value: Partial<T>,
    options: firestore.SetOptions
  ): this;
  set<T>(
    documentRef: firestore.DocumentReference<T>,
    value: T,
    options?: firestore.SetOptions
  ): this {
    const ref = validateReference(documentRef, this._firestore);
    const convertedValue = applyFirestoreDataConverter(
      ref._converter,
      value,
      options
    );
    const parsed = this._dataReader.parseSetData(
      'Transaction.set',
      ref._key,
      convertedValue,
      ref._converter !== null,
      options
    );
    this._transaction.set(ref._key, parsed);
    return this;
  }

  update(
    documentRef: firestore.DocumentReference<unknown>,
    value: firestore.UpdateData
  ): this;
  update(
    documentRef: firestore.DocumentReference<unknown>,
    field: string | ExternalFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): this;
  update(
    documentRef: firestore.DocumentReference<unknown>,
    fieldOrUpdateData: string | ExternalFieldPath | firestore.UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): this {
    const ref = validateReference(documentRef, this._firestore);

    let parsed;
    if (
      typeof fieldOrUpdateData === 'string' ||
      fieldOrUpdateData instanceof FieldPath
    ) {
      parsed = this._dataReader.parseUpdateVarargs(
        'Transaction.update',
        ref._key,
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      parsed = this._dataReader.parseUpdateData(
        'Transaction.update',
        ref._key,
        fieldOrUpdateData
      );
    }

    this._transaction.update(ref._key, parsed);
    return this;
  }

  delete(documentRef: firestore.DocumentReference<unknown>): this {
    const ref = validateReference(documentRef, this._firestore);
    this._transaction.delete(ref._key);
    return this;
  }
}

export class Transaction extends BaseTransaction
  implements firestore.Transaction {
  // This is the lite version of the Transaction API used in the legacy SDK. The
  // class is a close copy but takes different input types.

  get<T>(
    documentRef: firestore.DocumentReference<T>
  ): Promise<firestore.DocumentSnapshot<T>> {
    return this._getHelper<DocumentSnapshot<T>, T>(
      documentRef,
      (ref, doc) =>
        new DocumentSnapshot<T>(this._firestore, ref._key, doc, ref._converter)
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
