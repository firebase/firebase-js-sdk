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

import { Document } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { Firestore } from './database';
import {
  DocumentKeyReference,
  ParsedUpdateData,
  UserDataReader
} from '../../../src/api/user_data_reader';
import { Query as InternalQuery } from '../../../src/core/query';
import { ResourcePath } from '../../../src/model/path';
import { Code, FirestoreError } from '../../../src/util/error';
import { AutoId } from '../../../src/util/misc';
import { tryCast } from './util';
import { DocumentSnapshot } from './snapshot';
import {
  invokeBatchGetDocumentsRpc,
  invokeCommitRpc
} from '../../../src/remote/datastore';
import { hardAssert } from '../../../src/util/assert';
import { DeleteMutation, Precondition } from '../../../src/model/mutation';
import { PlatformSupport } from '../../../src/platform/platform';
import { applyFirestoreDataConverter } from '../../../src/api/database';
import { DatabaseId } from '../../../src/core/database_info';
import { FieldPath } from './field_path';

/**
 * A reference to a particular document in a collection in the database.
 */
export class DocumentReference<T = firestore.DocumentData>
  extends DocumentKeyReference<T>
  implements firestore.DocumentReference<T> {
  constructor(
    readonly firestore: Firestore,
    key: DocumentKey,
    readonly _converter?: firestore.FirestoreDataConverter<T>
  ) {
    super(firestore._databaseId, key, _converter);
  }

  get id(): string {
    return this._key.path.lastSegment();
  }

  get path(): string {
    return this._key.path.canonicalString();
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): firestore.DocumentReference<U> {
    return new DocumentReference<U>(this.firestore, this._key, converter);
  }
}

export class Query<T = firestore.DocumentData> implements firestore.Query<T> {
  constructor(
    readonly firestore: Firestore,
    readonly _query: InternalQuery,
    readonly _converter?: firestore.FirestoreDataConverter<T>
  ) {}

  where(
    fieldPath: string | firestore.FieldPath,
    opStr: firestore.WhereFilterOp,
    value: unknown
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  orderBy(
    fieldPath: string | firestore.FieldPath,
    directionStr?: firestore.OrderByDirection
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  limit(limit: number): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  limitToLast(limit: number): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  startAfter(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  startAt(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  endAt(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  endBefore(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    // TODO(firestorelite): Implement
    throw new Error('Not implemented');
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): firestore.Query<U> {
    return new Query<U>(this.firestore, this._query, converter);
  }
}

export class CollectionReference<T = firestore.DocumentData> extends Query<T>
  implements firestore.CollectionReference<T> {
  constructor(
    readonly firestore: Firestore,
    readonly _path: ResourcePath,
    readonly _converter?: firestore.FirestoreDataConverter<T>
  ) {
    super(firestore, InternalQuery.atPath(_path), _converter);
  }

  get id(): string {
    return this._query.path.lastSegment();
  }

  get path(): string {
    return this._query.path.canonicalString();
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): firestore.CollectionReference<U> {
    return new CollectionReference<U>(this.firestore, this._path, converter);
  }
}

export function collection(
  firestore: firestore.FirebaseFirestore,
  collectionPath: string
): CollectionReference<firestore.DocumentData>;
export function collection(
  reference: firestore.DocumentReference,
  collectionPath: string
): CollectionReference<firestore.DocumentData>;
export function collection(
  parent: firestore.FirebaseFirestore | firestore.DocumentReference<unknown>,
  relativePath: string
): CollectionReference<firestore.DocumentData> {
  if (relativePath.length === 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid path (${relativePath}). Empty paths are not supported.`
    );
  }

  const path = ResourcePath.fromString(relativePath);
  if (parent instanceof Firestore) {
    if (DocumentKey.isDocumentKey(path)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid path (${path}). Path points to a document.`
      );
    }
    return new CollectionReference(parent, path);
  } else {
    const doc = tryCast(parent, DocumentReference);
    const absolutePath = doc._key.path.child(path);
    if (DocumentKey.isDocumentKey(absolutePath)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid path (${absolutePath}). Path points to a document.`
      );
    }
    return new CollectionReference(doc.firestore, absolutePath);
  }
}

export function doc(
  firestore: firestore.FirebaseFirestore,
  documentPath: string
): DocumentReference<firestore.DocumentData>;
export function doc<T>(
  reference: firestore.CollectionReference<T>,
  documentPath?: string
): DocumentReference<T>;
export function doc<T>(
  parent: firestore.FirebaseFirestore | firestore.CollectionReference<T>,
  relativePath?: string
): DocumentReference {
  // We allow omission of 'pathString' but explicitly prohibit passing in both
  // 'undefined' and 'null'.
  if (arguments.length === 1) {
    relativePath = AutoId.newId();
  }

  if (!relativePath) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid path (${relativePath}). Empty paths are not supported.`
    );
  }

  const path = ResourcePath.fromString(relativePath);
  if (parent instanceof Firestore) {
    if (!DocumentKey.isDocumentKey(path)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid path (${path}). Path points to a collection.`
      );
    }
    return new DocumentReference(parent, new DocumentKey(path));
  } else {
    const coll = tryCast(parent, CollectionReference);
    const absolutePath = coll._path.child(path);
    if (!DocumentKey.isDocumentKey(absolutePath)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid path (${absolutePath}). Path points to a collection.`
      );
    }
    return new DocumentReference(
      coll.firestore,
      new DocumentKey(absolutePath),
      coll._converter
    );
  }
}

export function parent(
  reference: CollectionReference<unknown>
): DocumentReference<firestore.DocumentData> | null;
export function parent<T>(
  reference: DocumentReference<T>
): CollectionReference<T>;
export function parent<T>(
  child: firestore.CollectionReference<unknown> | firestore.DocumentReference<T>
): DocumentReference<firestore.DocumentData> | CollectionReference<T> | null {
  if (child instanceof CollectionReference) {
    const parentPath = child._path.popLast();
    if (parentPath.isEmpty()) {
      return null;
    } else {
      return new DocumentReference(
        child.firestore,
        new DocumentKey(parentPath)
      );
    }
  } else {
    const doc = tryCast(child, DocumentReference) as DocumentReference<T>;
    return new CollectionReference<T>(
      doc.firestore,
      doc._key.path.popLast(),
      doc._converter
    );
  }
}

export function getDoc<T>(
  reference: firestore.DocumentReference<T>
): Promise<firestore.DocumentSnapshot<T>> {
  const ref = tryCast(reference, DocumentReference) as DocumentReference<T>;
  return ref.firestore._ensureClientConfigured().then(async datastore => {
    const result = await invokeBatchGetDocumentsRpc(datastore, [ref._key]);
    hardAssert(result.length === 1, 'Expected a single document result');
    const maybeDocument = result[0];
    return new DocumentSnapshot<T>(
      ref.firestore,
      ref._key,
      maybeDocument instanceof Document ? maybeDocument : null,
      ref._converter
    );
  });
}

export function setDoc<T>(
  reference: firestore.DocumentReference<T>,
  data: T
): Promise<void>;
export function setDoc<T>(
  reference: firestore.DocumentReference<T>,
  data: Partial<T>,
  options: firestore.SetOptions
): Promise<void>;
export function setDoc<T>(
  reference: firestore.DocumentReference<T>,
  data: T,
  options?: firestore.SetOptions
): Promise<void> {
  const ref = tryCast(reference, DocumentReference);

  const [convertedValue] = applyFirestoreDataConverter(
    ref._converter,
    data,
    'setDoc'
  );

  // Kick off configuring the client, which freezes the settings.
  const configureClient = ref.firestore._ensureClientConfigured();
  const dataReader = newUserDataReader(
    ref.firestore._databaseId,
    ref.firestore._settings!
  );

  const parsed = isMerge(options)
    ? dataReader.parseMergeData('setDoc', convertedValue)
    : isMergeFields(options)
    ? dataReader.parseMergeData('setDoc', convertedValue, options.mergeFields)
    : dataReader.parseSetData('setDoc', convertedValue);

  return configureClient.then(datastore =>
    invokeCommitRpc(
      datastore,
      parsed.toMutations(ref._key, Precondition.none())
    )
  );
}

export function updateDoc(
  reference: firestore.DocumentReference,
  data: firestore.UpdateData
): Promise<void>;
export function updateDoc(
  reference: firestore.DocumentReference,
  field: string | firestore.FieldPath,
  value: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void>;
export function updateDoc(
  reference: firestore.DocumentReference,
  fieldOrUpdateData: string | firestore.FieldPath | firestore.UpdateData,
  value?: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void> {
  const ref = tryCast(reference, DocumentReference);

  // Kick off configuring the client, which freezes the settings.
  const configureClient = ref.firestore._ensureClientConfigured();
  const dataReader = newUserDataReader(
    ref.firestore._databaseId,
    ref.firestore._settings!
  );

  let parsed: ParsedUpdateData;
  if (
    typeof fieldOrUpdateData === 'string' ||
    fieldOrUpdateData instanceof FieldPath
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

  return configureClient.then(datastore =>
    invokeCommitRpc(
      datastore,
      parsed.toMutations(ref._key, Precondition.none())
    )
  );

  return ref.firestore
    ._ensureClientConfigured()
    .then(datastore =>
      invokeCommitRpc(
        datastore,
        parsed.toMutations(ref._key, Precondition.exists(true))
      )
    );
}

export function deleteDoc(
  reference: firestore.DocumentReference
): Promise<void> {
  const ref = tryCast(reference, DocumentReference);
  return ref.firestore
    ._ensureClientConfigured()
    .then(datastore =>
      invokeCommitRpc(datastore, [
        new DeleteMutation(ref._key, Precondition.none())
      ])
    );
}

export function addDoc<T>(
  reference: firestore.CollectionReference<T>,
  data: T
): Promise<firestore.DocumentReference<T>> {
  const collRef = tryCast(reference, CollectionReference);
  const docRef = doc(collRef);

  const [convertedValue] = applyFirestoreDataConverter(
    collRef._converter,
    data,
    'addDoc'
  );

  // Kick off configuring the client, which freezes the settings.
  const configureClient = collRef.firestore._ensureClientConfigured();
  const dataReader = newUserDataReader(
    collRef.firestore._databaseId,
    collRef.firestore._settings!
  );
  const parsed = dataReader.parseSetData('addDoc', convertedValue);

  return configureClient
    .then(datastore =>
      invokeCommitRpc(
        datastore,
        parsed.toMutations(docRef._key, Precondition.exists(false))
      )
    )
    .then(() => docRef);
}

/** Returns true if options.merge is true. */
function isMerge(options?: firestore.SetOptions): options is { merge: true } {
  return !!options && (options as { merge: true }).merge;
}

/** Returns true if options.mergeFields is set. */
function isMergeFields(
  options?: firestore.SetOptions
): options is { mergeFields: Array<string | firestore.FieldPath> } {
  return (
    !!options &&
    !!(options as { mergeFields: Array<string | firestore.FieldPath> })
      .mergeFields
  );
}

function newUserDataReader(
  databaseId: DatabaseId,
  settings: firestore.Settings
): UserDataReader {
  const serializer = PlatformSupport.getPlatform().newSerializer(databaseId);
  return new UserDataReader(
    databaseId,
    !!settings.ignoreUndefinedProperties,
    serializer
  );
}
