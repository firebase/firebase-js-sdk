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
import {
  DeleteMutation,
  Mutation,
  Precondition
} from '../../../src/model/mutation';
import { Code, FirestoreError } from '../../../src/util/error';
import { applyFirestoreDataConverter } from '../../../src/api/database';
import {
  DocumentKeyReference,
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs,
  UserDataReader
} from '../../../src/api/user_data_reader';
import { cast } from './util';
import { DocumentReference, newUserDataReader } from './reference';
import { Firestore } from './database';
import { invokeCommitRpc } from '../../../src/remote/datastore';
import { FieldPath } from './field_path';

export class WriteBatch implements firestore.WriteBatch {
  // This is the lite version of the WriteBatch API used in the legacy SDK. The
  // class is a close copy but takes different input types.

  private readonly _dataReader: UserDataReader;
  private _mutations = [] as Mutation[];
  private _committed = false;

  constructor(
    private readonly _firestore: Firestore,
    private readonly _commitHandler: (m: Mutation[]) => Promise<void>
  ) {
    this._dataReader = newUserDataReader(_firestore);
  }

  set<T>(documentRef: firestore.DocumentReference<T>, value: T): WriteBatch;
  set<T>(
    documentRef: firestore.DocumentReference<T>,
    value: Partial<T>,
    options: firestore.SetOptions
  ): WriteBatch;
  set<T>(
    documentRef: firestore.DocumentReference<T>,
    value: T,
    options?: firestore.SetOptions
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
    documentRef: firestore.DocumentReference<unknown>,
    value: firestore.UpdateData
  ): WriteBatch;
  update(
    documentRef: firestore.DocumentReference<unknown>,
    field: string | firestore.FieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  update(
    documentRef: firestore.DocumentReference<unknown>,
    fieldOrUpdateData: string | firestore.FieldPath | firestore.UpdateData,
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

  delete(documentRef: firestore.DocumentReference<unknown>): WriteBatch {
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
  documentRef: firestore.DocumentReference<T>,
  firestore: Firestore
): DocumentKeyReference<T> {
  if (documentRef.firestore !== firestore) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Provided document reference is from a different Firestore instance.'
    );
  } else {
    return cast(documentRef, DocumentReference) as DocumentReference<T>;
  }
}

export function writeBatch(
  firestore: firestore.FirebaseFirestore
): firestore.WriteBatch {
  const firestoreImpl = cast(firestore, Firestore);
  return new WriteBatch(firestoreImpl, writes =>
    firestoreImpl
      ._getDatastore()
      .then(datastore => invokeCommitRpc(datastore, writes))
  );
}
