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
  UserDataReader
} from '../../../src/api/user_data_reader';
import { tryCast } from './util';
import {
  DocumentReference,
  isMerge,
  isMergeFields,
  newUserDataReader
} from './reference';
import { Firestore } from './database';
import { invokeCommitRpc } from '../../../src/remote/datastore';
import { FieldPath } from './field_path';

export class WriteBatch implements firestore.WriteBatch {
  // This is the lite version of the WriteBatch API used in the legacy SDK. The
  // class is a close copy but takes different input types.

  private _mutations = [] as Mutation[];
  private _committed = false;
  private _dataReader: UserDataReader;

  constructor(private _firestore: Firestore) {
    // Kick off configuring the client, which freezes the settings.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    _firestore._ensureClientConfigured();
    this._dataReader = newUserDataReader(
      _firestore._databaseId,
      _firestore._settings!
    );
  }

  set<T>(
    documentRef: firestore.DocumentReference<T>,
    value: T,
    options?: firestore.SetOptions
  ): WriteBatch {
    this.verifyNotCommitted();
    const ref = tryCast(documentRef, DocumentReference);

    const [convertedValue] = applyFirestoreDataConverter(
      ref._converter,
      value,
      'WriteBatch.set'
    );

    const parsed = isMerge(options)
      ? this._dataReader.parseMergeData('WriteBatch.set', convertedValue)
      : isMergeFields(options)
      ? this._dataReader.parseMergeData(
          'WriteBatch.set',
          convertedValue,
          options.mergeFields
        )
      : this._dataReader.parseSetData('WriteBatch.set', convertedValue);

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
    const ref = tryCast(documentRef, DocumentReference);

    let parsed;

    if (
      typeof fieldOrUpdateData === 'string' ||
      fieldOrUpdateData instanceof FieldPath
    ) {
      parsed = this._dataReader.parseUpdateVarargs(
        'WriteBatch.update',
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      parsed = this._dataReader.parseUpdateData(
        'WriteBatch.update',
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
    const ref = tryCast(documentRef, DocumentReference);
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
        ._ensureClientConfigured()
        .then(datastore => invokeCommitRpc(datastore, this._mutations));
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
  firestore: Firestore
): DocumentKeyReference<T> {
  if (documentRef.firestore !== firestore) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Provided document reference is from a different Firestore instance.'
    );
  } else {
    return documentRef;
  }
}

export function writeBatch(
  firestore: firestore.FirebaseFirestore
): firestore.WriteBatch {
  return new WriteBatch(tryCast(firestore, Firestore));
}
