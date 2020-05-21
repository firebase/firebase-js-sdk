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
  DeleteMutation,
  Mutation,
  Precondition
} from '../../../src/model/mutation';
import {
  invalidClassError,
  validateAtLeastNumberOfArgs,
  validateBetweenNumberOfArgs,
  validateExactNumberOfArgs
} from '../../../src/util/input_validation';
import {
  FieldPath as ExternalFieldPath,
  FieldPath
} from '../../../src/api/field_path';
import { Code, FirestoreError } from '../../../src/util/error';
import { Firestore } from './database';
import { UserDataReader } from '../../../src/api/user_data_reader';
import { invokeCommitRpc } from '../../../src/remote/datastore';
import { DocumentReference } from './reference';
import { SetOptions } from '../../';

export class WriteBatch implements firestore.WriteBatch {
  private _mutations = [] as Mutation[];
  private _committed = false;
  private _dataReader: UserDataReader;

  constructor(private _firestore: Firestore) {
    this._dataReader = new UserDataReader(this._firestore._databaseId);
  }

  set<T>(
    documentRef: firestore.DocumentReference<T>,
    value: T,
    options?: firestore.SetOptions
  ): WriteBatch {
    validateBetweenNumberOfArgs('WriteBatch.set', arguments, 2, 3);
    this.verifyNotCommitted();
    const ref = validateReference(
      'WriteBatch.set',
      documentRef,
      this._firestore
    );
    const [convertedValue, functionName] = applyFirestoreDataConverter(
      {} as any, // TODO(lite)
      value,
      'WriteBatch.set'
    );

    // TODO(lite): Extract method
    const parsed = isMerge(options)
      ? this._dataReader.parseMergeData(functionName, convertedValue)
      : isMergeFields(options)
      ? this._dataReader.parseMergeData(
          functionName,
          convertedValue,
          options.mergeFields
        )
      : this._dataReader.parseSetData(functionName, convertedValue);
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
    field: string | ExternalFieldPath,
    value: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch;
  update(
    documentRef: firestore.DocumentReference<unknown>,
    fieldOrUpdateData: string | ExternalFieldPath | firestore.UpdateData,
    value?: unknown,
    ...moreFieldsAndValues: unknown[]
  ): WriteBatch {
    this.verifyNotCommitted();

    let ref;
    let parsed;

    if (
      typeof fieldOrUpdateData === 'string' ||
      fieldOrUpdateData instanceof ExternalFieldPath
    ) {
      validateAtLeastNumberOfArgs('WriteBatch.update', arguments, 3);
      ref = validateReference(
        'WriteBatch.update',
        documentRef,
        this._firestore
      );
      parsed = this._dataReader.parseUpdateVarargs(
        'WriteBatch.update',
        fieldOrUpdateData,
        value,
        moreFieldsAndValues
      );
    } else {
      validateExactNumberOfArgs('WriteBatch.update', arguments, 2);
      ref = validateReference(
        'WriteBatch.update',
        documentRef,
        this._firestore
      );
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
    validateExactNumberOfArgs('WriteBatch.delete', arguments, 1);
    this.verifyNotCommitted();
    const ref = validateReference(
      'WriteBatch.delete',
      documentRef,
      this._firestore
    );
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

function validateReference<T>(
  methodName: string,
  documentRef: firestore.DocumentReference<T>,
  firestore: Firestore
): DocumentReference<T> {
  if (!(documentRef instanceof DocumentReference)) {
    throw invalidClassError(methodName, 'DocumentReference', 1, documentRef);
  } else if (documentRef.firestore !== firestore) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Provided document reference is from a different Firestore instance.'
    );
  } else {
    return documentRef;
  }
}

/**
 * Converts custom model object of type T into DocumentData by applying the
 * converter if it exists.
 *
 * This function is used when converting user objects to DocumentData
 * because we want to provide the user with a more specific error message if
 * their set() or fails due to invalid data originating from a toFirestore()
 * call.
 */
function applyFirestoreDataConverter<T>(
  converter: firestore.FirestoreDataConverter<T> | undefined,
  value: T,
  functionName: string
): [firestore.DocumentData, string] {
  let convertedValue;
  if (converter) {
    convertedValue = converter.toFirestore(value);
    functionName = 'toFirestore() in ' + functionName;
  } else {
    convertedValue = value as firestore.DocumentData;
  }
  return [convertedValue, functionName];
}

export function isMerge(options?: SetOptions): options is { merge: true } {
  return !!options && (options as { merge: true }).merge;
}

export function isMergeFields(
  options?: SetOptions
): options is { mergeFields: Array<string | FieldPath> } {
  return (
    !!options &&
    !!(options as { mergeFields: Array<string | FieldPath> }).mergeFields
  );
}
