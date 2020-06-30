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

// See https://github.com/typescript-eslint/typescript-eslint/issues/363
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as firestore from '../../index';

import { cast } from '../../../lite/src/api/util';
import { Firestore } from './database';
import {
  DeleteMutation,
  Mutation,
  Precondition
} from '../../../src/model/mutation';
import { Code, FirestoreError } from '../../../src/util/error';
import { applyFirestoreDataConverter } from '../../../src/api/database';
import {
  convertSetToMutations,
  convertUpdateToMutations,
  UserDataReader
} from '../../../src/api/user_data_reader';
import { newUserDataReader } from '../../../lite/src/api/reference';
import { FieldPath } from '../../../lite/src/api/field_path';
import { validateReference } from '../../../lite/src/api/write_batch';

export class WriteBatch implements firestore.WriteBatch {
  private readonly _dataReader: UserDataReader;
  private _mutations = [] as Mutation[];
  private _committed = false;

  constructor(private readonly _firestore: Firestore) {
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
    const parsed = this._dataReader.parseSetData(
      'WriteBatch.set',
      ref._key,
      convertedValue,
      ref._converter !== null,
      options
    );
    this._mutations = this._mutations.concat(
      convertSetToMutations(parsed, ref._key, Precondition.none())
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
      parsed = this._dataReader.parseUpdateVarargs(
        'WriteBatch.update',
        ref._key,
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      parsed = this._dataReader.parseUpdateData(
        'WriteBatch.update',
        ref._key,
        fieldOrUpdateData
      );
    }

    this._mutations = this._mutations.concat(
      convertUpdateToMutations(parsed, ref._key, Precondition.exists(true))
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
      return this._firestore
        ._getFirestoreClient()
        .then(firestoreClient => firestoreClient.write(this._mutations));
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

export function writeBatch(
  firestore: firestore.FirebaseFirestore
): firestore.WriteBatch {
  const firestoreImpl = cast(firestore, Firestore);
  return new WriteBatch(firestoreImpl);
}
