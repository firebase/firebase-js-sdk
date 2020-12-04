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
  DeleteMutation,
  Mutation,
  Precondition
} from '../../../src/model/mutation';
import { Code, FirestoreError } from '../../../src/util/error';
import {
  newUserDataReader,
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs,
  UserDataReader
} from '../../../src/api/user_data_reader';
import { DocumentReference, SetOptions, UpdateData } from './reference';
import { FirebaseFirestore } from './database';
import { invokeCommitRpc } from '../../../src/remote/datastore';
import { FieldPath } from './field_path';
import { getDatastore } from './components';
import { cast } from '../../../src/util/input_validation';
import { Compat } from '../../../src/api/compat';
import { applyFirestoreDataConverter } from './reference_methods';

/**
 * A write batch, used to perform multiple writes as a single atomic unit.
 *
 * A `WriteBatch` object can be acquired by calling {@link writeBatch}. It
 * provides methods for adding writes to the write batch. None of the writes
 * will be committed (or visible locally) until {@link WriteBatch#commit} is
 * called.
 */
export class WriteBatch {
  // This is the lite version of the WriteBatch API used in the legacy SDK. The
  // class is a close copy but takes different input types.

  private readonly _dataReader: UserDataReader;
  private _mutations = [] as Mutation[];
  private _committed = false;

  /** @hideconstructor */
  constructor(
    private readonly _firestore: FirebaseFirestore,
    private readonly _commitHandler: (m: Mutation[]) => Promise<void>
  ) {
    this._dataReader = newUserDataReader(_firestore);
  }

  /**
   * Writes to the document referred to by the provided {@link
   * DocumentReference}. If the document does not exist yet, it will be created.
   *
   * @param documentRef - A reference to the document to be set.
   * @param data - An object of the fields and values for the document.
   * @returns This `WriteBatch` instance. Used for chaining method calls.
   */
  set<T>(documentRef: DocumentReference<T>, data: T): WriteBatch;
  /**
   * Writes to the document referred to by the provided {@link
   * DocumentReference}. If the document does not exist yet, it will be created.
   * If you provide `merge` or `mergeFields`, the provided data can be merged
   * into an existing document.
   *
   * @param documentRef - A reference to the document to be set.
   * @param data - An object of the fields and values for the document.
   * @param options - An object to configure the set behavior.
   * @returns This `WriteBatch` instance. Used for chaining method calls.
   */
  set<T>(
    documentRef: DocumentReference<T>,
    data: Partial<T>,
    options: SetOptions
  ): WriteBatch;
  set<T>(
    documentRef: DocumentReference<T>,
    data: T,
    options?: SetOptions
  ): WriteBatch {
    this._verifyNotCommitted();
    const ref = validateReference(documentRef, this._firestore);

    const convertedValue = applyFirestoreDataConverter(
      ref._converter,
      data,
      options
    );
    const parsed = parseSetData(
      this._dataReader,
      'WriteBatch.set',
      ref._key,
      convertedValue,
      ref._converter !== null,
      options
    );
    this._mutations = this._mutations.concat(
      parsed.toMutations(ref._key, Precondition.none())
    );
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
   * @returns This `WriteBatch` instance. Used for chaining method calls.
   */
  update(documentRef: DocumentReference<unknown>, data: UpdateData): WriteBatch;
  /**
   * Updates fields in the document referred to by this {@link
   * DocumentReference}. The update will fail if applied to a document that does
   * not exist.
   *
   * Nested fields can be update by providing dot-separated field path strings
   * or by providing `FieldPath` objects.
   *
   * @param documentRef - A reference to the document to be updated.
   * @param field - The first field to update.
   * @param value - The first value.
   * @param moreFieldsAndValues - Additional key value pairs.
   * @returns This `WriteBatch` instance. Used for chaining method calls.
   */
  update(
    documentRef: DocumentReference<unknown>,
    field: string | FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  update(
    documentRef: DocumentReference<unknown>,
    fieldOrUpdateData: string | FieldPath | UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch {
    this._verifyNotCommitted();
    const ref = validateReference(documentRef, this._firestore);

    // For Compat types, we have to "extract" the underlying types before
    // performing validation.
    if (fieldOrUpdateData instanceof Compat) {
      fieldOrUpdateData = fieldOrUpdateData._delegate;
    }

    let parsed;
    if (
      typeof fieldOrUpdateData === 'string' ||
      fieldOrUpdateData instanceof FieldPath
    ) {
      parsed = parseUpdateVarargs(
        this._dataReader,
        'WriteBatch.update',
        ref._key,
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      parsed = parseUpdateData(
        this._dataReader,
        'WriteBatch.update',
        ref._key,
        fieldOrUpdateData
      );
    }

    this._mutations = this._mutations.concat(
      parsed.toMutations(ref._key, Precondition.exists(true))
    );
    return this;
  }

  /**
   * Deletes the document referred to by the provided {@link DocumentReference}.
   *
   * @param documentRef - A reference to the document to be deleted.
   * @returns This `WriteBatch` instance. Used for chaining method calls.
   */
  delete(documentRef: DocumentReference<unknown>): WriteBatch {
    this._verifyNotCommitted();
    const ref = validateReference(documentRef, this._firestore);
    this._mutations = this._mutations.concat(
      new DeleteMutation(ref._key, Precondition.none())
    );
    return this;
  }

  /**
   * Commits all of the writes in this write batch as a single atomic unit.
   *
   * The result of these writes will only be reflected in document reads that
   * occur after the returned Promise resolves. If the client is offline, the
   * write fails. If you would like to see local modifications or buffer writes
   * until the client is online, use the full Firestore SDK.
   *
   * @returns A Promise resolved once all of the writes in the batch have been
   * successfully written to the backend as an atomic unit (note that it won't
   * resolve while you're offline).
   */
  commit(): Promise<void> {
    this._verifyNotCommitted();
    this._committed = true;
    if (this._mutations.length > 0) {
      return this._commitHandler(this._mutations);
    }

    return Promise.resolve();
  }

  private _verifyNotCommitted(): void {
    if (this._committed) {
      throw new FirestoreError(
        Code.FAILED_PRECONDITION,
        'A write batch can no longer be used after commit() ' +
          'has been called.'
      );
    }
  }
}

export function validateReference<T>(
  documentRef: DocumentReference<T> | Compat<DocumentReference<T>>,
  firestore: FirebaseFirestore
): DocumentReference<T> {
  if (documentRef instanceof Compat) {
    documentRef = documentRef._delegate;
  }
  if (documentRef.firestore !== firestore) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Provided document reference is from a different Firestore instance.'
    );
  } else {
    return documentRef as DocumentReference<T>;
  }
}

/**
 * Creates a write batch, used for performing multiple writes as a single
 * atomic operation. The maximum number of writes allowed in a single WriteBatch
 * is 500.
 *
 * The result of these writes will only be reflected in document reads that
 * occur after the returned Promise resolves. If the client is offline, the
 * write fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @returns A `WriteBatch` that can be used to atomically execute multiple
 * writes.
 */
export function writeBatch(firestore: FirebaseFirestore): WriteBatch {
  firestore = cast(firestore, FirebaseFirestore);
  const datastore = getDatastore(firestore);
  return new WriteBatch(firestore, writes =>
    invokeCommitRpc(datastore, writes)
  );
}
