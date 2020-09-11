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
import { applyFirestoreDataConverter } from '../../../src/api/database';
import {
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs,
  UserDataReader
} from '../../../src/api/user_data_reader';
import {
  DocumentReference,
  newUserDataReader,
  SetOptions,
  UpdateData
} from './reference';
import { FirebaseFirestore } from './database';
import { invokeCommitRpc } from '../../../src/remote/datastore';
import { FieldPath } from './field_path';
import { getDatastore } from './components';

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

  set<T>(documentRef: DocumentReference<T>, value: T): WriteBatch;
  set<T>(
    documentRef: DocumentReference<T>,
    value: Partial<T>,
    options: SetOptions
  ): WriteBatch;
  set<T>(
    documentRef: DocumentReference<T>,
    value: T,
    options?: SetOptions
  ): WriteBatch {
    this.verifyNotCommitted();
    const ref = validateReference(documentRef, this._firestore);

    const convertedValue = applyFirestoreDataConverter(
      ref._converter,
      value,
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

  update(
    documentRef: DocumentReference<unknown>,
    value: UpdateData
  ): WriteBatch;
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
    this.verifyNotCommitted();
    const ref = validateReference(documentRef, this._firestore);

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

  delete(documentRef: DocumentReference<unknown>): WriteBatch {
    this.verifyNotCommitted();
    const ref = validateReference(documentRef, this._firestore);
    this._mutations = this._mutations.concat(
      new DeleteMutation(ref._key, Precondition.none())
    );
    return this;
  }

  commit(): Promise<void> {
    this.verifyNotCommitted();
    this._committed = true;
    if (this._mutations.length > 0) {
      return this._commitHandler(this._mutations);
    }

    return Promise.resolve();
  }

  private verifyNotCommitted(): void {
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
  documentRef: DocumentReference<T>,
  firestore: FirebaseFirestore
): DocumentReference<T> {
  if (documentRef.firestore !== firestore) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Provided document reference is from a different Firestore instance.'
    );
  } else {
    return documentRef as DocumentReference<T>;
  }
}

export function writeBatch(firestore: FirebaseFirestore): WriteBatch {
  const datastore = getDatastore(firestore);
  return new WriteBatch(firestore, writes =>
    invokeCommitRpc(datastore, writes)
  );
}
