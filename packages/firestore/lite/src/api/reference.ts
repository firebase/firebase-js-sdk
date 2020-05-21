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

import { hardAssert } from '../../../src/util/assert';

import { Document } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { Firestore } from './database';
import { ResourcePath } from '../../../src/model/path';
import { Code, FirestoreError } from '../../../src/util/error';
import { AutoId } from '../../../src/util/misc';
import {
  invokeBatchGetDocumentsRpc,
  invokeCommitRpc,
  invokeRunQueryRpc
} from '../../../src/remote/datastore';
import { DeleteMutation, Precondition } from '../../../src/model/mutation';
import {
  DocumentKeyReference,
  ParsedUpdateData
} from '../../../src/api/user_data_reader';
import { FieldPath as ExternalFieldPath } from '../../../src/api/field_path';
import { DocumentSnapshot, QuerySnapshot } from './snapshot';
import { Query as InternalQuery } from '../../../src/core/query';
import { isMerge, isMergeFields } from './write_batch';

/**
 * A reference to a particular document in a collection in the database.
 */
export class DocumentReference<T = firestore.DocumentData>
  extends DocumentKeyReference
  implements firestore.DocumentReference<T> {
  constructor(key: DocumentKey, readonly firestore: Firestore) {
    super(firestore._databaseId, key);
  }
}

export function collection(
  parent: Firestore | DocumentReference,
  relativePath: string
): CollectionReference {
  if (relativePath.length == 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Must provide a non-empty collection name to collection()'
    );
  }

  if (parent instanceof Firestore) {
    return new CollectionReference(
      ResourcePath.fromString(relativePath),
      parent
    );
  } else {
    return new CollectionReference(
      parent._key.path.child(relativePath),
      parent.firestore
    );
  }
}

export function doc(
  parent: CollectionReference,
  relativePath?: string
): DocumentReference {
  if (relativePath && relativePath.length == 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Must provide a non-empty document name to doc()'
    );
  }
  return new DocumentReference(
    new DocumentKey(parent._path.child(relativePath || AutoId.newId())),
    parent.firestore
  );
}

export function parent(
  child: CollectionReference | DocumentReference
): DocumentReference | CollectionReference {
  if (child instanceof CollectionReference) {
    return new DocumentReference(
      new DocumentKey(child._path.popLast()),
      child.firestore
    );
  } else {
    return new CollectionReference(child._key.path.popLast(), child.firestore);
  }
}

export class Query<T = firestore.DocumentData> implements firestore.Query<T> {
  constructor(public _query: InternalQuery, readonly firestore: Firestore) {}
}

export class CollectionReference<T = firestore.DocumentData> extends Query<T>
  implements firestore.CollectionReference<T> {
  constructor(readonly _path: ResourcePath, readonly firestore: Firestore) {
    super(InternalQuery.atPath(_path), firestore);
  }

  doc(pathString?: string): DocumentReference<T> {
    if (pathString === '') {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Document path must be a non-empty string'
      );
    }
    const path = ResourcePath.fromString(pathString || AutoId.newId());
    return new DocumentReference<T>(
      new DocumentKey(this._path.child(path)),
      this.firestore
    );
  }
}

export function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot> {
  const firestore = reference.firestore;
  return firestore._ensureClientConfigured().then(async datastore => {
    const result = await invokeBatchGetDocumentsRpc(datastore, [
      reference._key
    ]);
    hardAssert(result.length == 1, 'Expected a single document result');
    const maybeDocument = result[0];
    return new DocumentSnapshot<firestore.DocumentData>(
      firestore,
      reference._key,
      maybeDocument instanceof Document ? maybeDocument : null
    );
  });
}

export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T,
  options?: firestore.SetOptions
): Promise<void> {
  const firestore = reference.firestore;
  const dataReader = firestore._dataReader;
  const convertedValue = data; // TODO(support converter)
  const parsed = isMerge(options)
    ? dataReader.parseMergeData('setDoc', convertedValue)
    : isMergeFields(options)
    ? dataReader.parseMergeData('setDoc', convertedValue, options.mergeFields)
    : dataReader.parseSetData('setDoc', convertedValue);
  return firestore
    ._ensureClientConfigured()
    .then(datastore =>
      invokeCommitRpc(
        datastore,
        parsed.toMutations(reference._key, Precondition.none())
      )
    );
}

export function deleteDoc(reference: DocumentReference): Promise<void> {
  return reference.firestore
    ._ensureClientConfigured()
    .then(datastore =>
      invokeCommitRpc(datastore, [
        new DeleteMutation(reference._key, Precondition.none())
      ])
    );
}

export function updateDoc(
  reference: DocumentReference,
  fieldOrUpdateData: string | ExternalFieldPath | firestore.UpdateData,
  value?: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void> {
  const firestore = reference.firestore;
  const dataReader = firestore._dataReader;

  let parsed: ParsedUpdateData;
  if (
    typeof fieldOrUpdateData === 'string' ||
    fieldOrUpdateData instanceof ExternalFieldPath
  ) {
    parsed = dataReader.parseUpdateVarargs(
      'updateDoc',
      fieldOrUpdateData,
      value,
      moreFieldsAndValues
    );
  } else {
    parsed = dataReader.parseUpdateData('updateDoc', fieldOrUpdateData);
  }

  return firestore
    ._ensureClientConfigured()
    .then(datastore =>
      invokeCommitRpc(
        datastore,
        parsed.toMutations(reference._key, Precondition.exists(true))
      )
    );
}

export function getQuery<T>(query: Query<T>): Promise<QuerySnapshot> {
  const firestore = query.firestore;
  return firestore._ensureClientConfigured().then(async datastore => {
    const result = await invokeRunQueryRpc(datastore, query._query);
    return new QuerySnapshot<T>(firestore, query._query, result);
  });
}
