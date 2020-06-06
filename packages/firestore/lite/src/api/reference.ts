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
import {
  Bound,
  Direction,
  Operator,
  Query as InternalQuery
} from '../../../src/core/query';
import { ResourcePath } from '../../../src/model/path';
import { AutoId } from '../../../src/util/misc';
import {
  DocumentSnapshot,
  QueryDocumentSnapshot,
  QuerySnapshot,
  fieldPathFromArgument
} from './snapshot';
import {
  invokeBatchGetDocumentsRpc,
  invokeCommitRpc,
  invokeRunQueryRpc
} from '../../../src/remote/datastore';
import { hardAssert } from '../../../src/util/assert';
import { DeleteMutation, Precondition } from '../../../src/model/mutation';
import { PlatformSupport } from '../../../src/platform/platform';
import {
  applyFirestoreDataConverter,
  BaseQuery
} from '../../../src/api/database';
import { DatabaseId } from '../../../src/core/database_info';
import { FieldPath } from './field_path';
import { cast } from './util';
import {
  validateArgType,
  validateCollectionPath,
  validateDocumentPath,
  validatePositiveNumber
} from '../../../src/util/input_validation';
import { Code, FirestoreError } from '../../../src/util/error';
import { FieldPath as ExternalFieldPath } from '../../../src/api/field_path';

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

export class Query<T = firestore.DocumentData> extends BaseQuery
  implements firestore.Query<T> {
  // This is the lite version of the Query class in the main SDK.
  constructor(
    readonly firestore: Firestore,
    readonly _query: InternalQuery,
    readonly _converter?: firestore.FirestoreDataConverter<T>
  ) {
    super(
      firestore._databaseId,
      newUserDataReader(firestore._databaseId, firestore._settings!),
      _query
    );
  }

  where(
    fieldPath: string | firestore.FieldPath,
    opStr: firestore.WhereFilterOp,
    value: unknown
  ): firestore.Query<T> {
    // TODO(firestorelite): Consider validating the enum strings (note that
    // TypeScript does not support passing invalid values).
    const op = opStr as Operator;

    const field = fieldPathFromArgument('Query.where', fieldPath);
    const filter = this.createFilter(field, op, value);
    return new Query(
      this.firestore,
      this._query.addFilter(filter),
      this._converter
    );
  }

  orderBy(
    field: string | ExternalFieldPath,
    directionStr: firestore.OrderByDirection = 'asc'
  ): firestore.Query<T> {
    // TODO(firestorelite): Consider validating the enum strings (note that
    // TypeScript does not support passing invalid values).
    const direction = directionStr as Direction;

    const fieldPath = fieldPathFromArgument('Query.orderBy', field);
    const orderBy = this.createOrderBy(fieldPath, direction);
    return new Query(
      this.firestore,
      this._query.addOrderBy(orderBy),
      this._converter
    );
  }

  limit(n: number): firestore.Query<T> {
    validatePositiveNumber('Query.limit', 1, n);
    return new Query(
      this.firestore,
      this._query.withLimitToFirst(n),
      this._converter
    );
  }

  limitToLast(n: number): firestore.Query<T> {
    validatePositiveNumber('Query.limitToLast', 1, n);
    return new Query(
      this.firestore,
      this._query.withLimitToLast(n),
      this._converter
    );
  }

  startAt(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    const bound = this.boundFromDocOrFields(
      'Query.startAt',
      docOrField,
      fields,
      /*before=*/ true
    );
    return new Query(
      this.firestore,
      this._query.withStartAt(bound),
      this._converter
    );
  }

  startAfter(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    const bound = this.boundFromDocOrFields(
      'Query.startAfter',
      docOrField,
      fields,
      /*before=*/ false
    );
    return new Query(
      this.firestore,
      this._query.withStartAt(bound),
      this._converter
    );
  }

  endBefore(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    const bound = this.boundFromDocOrFields(
      'Query.endBefore',
      docOrField,
      fields,
      /*before=*/ true
    );
    return new Query(
      this.firestore,
      this._query.withEndAt(bound),
      this._converter
    );
  }

  endAt(
    docOrField: unknown | firestore.DocumentSnapshot<unknown>,
    ...fields: unknown[]
  ): firestore.Query<T> {
    const bound = this.boundFromDocOrFields(
      'Query.endAt',
      docOrField,
      fields,
      /*before=*/ false
    );
    return new Query(
      this.firestore,
      this._query.withEndAt(bound),
      this._converter
    );
  }

  /** Helper function to create a bound from a document or fields */
  private boundFromDocOrFields(
    methodName: string,
    docOrField: unknown | firestore.DocumentSnapshot<T>,
    fields: unknown[],
    before: boolean
  ): Bound {
    if (docOrField instanceof DocumentSnapshot) {
      if (fields.length > 0) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Too many arguments provided to ${methodName}().`
        );
      }
      const snap = docOrField;
      if (!snap.exists) {
        throw new FirestoreError(
          Code.NOT_FOUND,
          `Can't use a DocumentSnapshot that doesn't exist for ` +
            `${methodName}().`
        );
      }
      return this.boundFromDocument(snap._document!, before);
    } else {
      const allFields = [docOrField].concat(fields);
      return this.boundFromFields(methodName, allFields, before);
    }
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
  validateArgType('doc', 'non-empty string', 2, relativePath);
  const path = ResourcePath.fromString(relativePath);
  if (parent instanceof Firestore) {
    // Kick off configuring the client, which freezes the settings.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    parent._ensureClientConfigured();

    validateCollectionPath(path);
    return new CollectionReference(parent, path);
  } else {
    const doc = cast(parent, DocumentReference);
    const absolutePath = doc._key.path.child(path);
    validateCollectionPath(absolutePath);
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
  validateArgType('doc', 'non-empty string', 2, relativePath);
  const path = ResourcePath.fromString(relativePath!);
  if (parent instanceof Firestore) {
    // Kick off configuring the client, which freezes the settings.
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    parent._ensureClientConfigured();

    validateDocumentPath(path);
    return new DocumentReference(parent, new DocumentKey(path));
  } else {
    const coll = cast(parent, CollectionReference);
    const absolutePath = coll._path.child(path);
    validateDocumentPath(absolutePath);
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
    const doc = cast<DocumentReference<T>>(child, DocumentReference);
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
  const ref = cast<DocumentReference<T>>(reference, DocumentReference);
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

export function getQuery<T>(
  query: firestore.Query<T>
): Promise<firestore.QuerySnapshot<T>> {
  const internalQuery = cast<Query<T>>(query, Query);
  return internalQuery.firestore
    ._ensureClientConfigured()
    .then(async datastore => {
      const result = await invokeRunQueryRpc(datastore, internalQuery._query);
      const docs = result.map(
        doc =>
          new QueryDocumentSnapshot<T>(
            internalQuery.firestore,
            doc.key,
            doc,
            internalQuery._converter
          )
      );

      if (internalQuery._query.hasLimitToLast()) {
        // Limit to last queries reverse the orderBy constraint that was
        // specified by the user. As such, we need to reverse the order of the
        // results to return the documents in the expected order.
        docs.reverse();
      }

      return new QuerySnapshot<T>(query, docs);
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
  const ref = cast(reference, DocumentReference);

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

  const parsed = dataReader.parseSetData('setDoc', convertedValue, options);

  return configureClient.then(datastore =>
    invokeCommitRpc(
      datastore,
      parsed.toMutations(ref._key, Precondition.none())
    )
  );
}

export function updateDoc(
  reference: firestore.DocumentReference<unknown>,
  data: firestore.UpdateData
): Promise<void>;
export function updateDoc(
  reference: firestore.DocumentReference<unknown>,
  field: string | firestore.FieldPath,
  value: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void>;
export function updateDoc(
  reference: firestore.DocumentReference<unknown>,
  fieldOrUpdateData: string | firestore.FieldPath | firestore.UpdateData,
  value?: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void> {
  const ref = cast(reference, DocumentReference);

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
  const ref = cast(reference, DocumentReference);
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
  const collRef = cast(reference, CollectionReference);
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

export function refEqual<T>(
  left: firestore.DocumentReference<T> | firestore.CollectionReference<T>,
  right: firestore.DocumentReference<T> | firestore.CollectionReference<T>
): boolean {
  if (
    (left instanceof DocumentReference ||
      left instanceof CollectionReference) &&
    (right instanceof DocumentReference || right instanceof CollectionReference)
  ) {
    return (
      left.firestore === right.firestore &&
      left.path === right.path &&
      left._converter === right._converter
    );
  }
  return false;
}

export function queryEqual<T>(
  left: firestore.Query<T>,
  right: firestore.Query<T>
): boolean {
  if (left instanceof Query && right instanceof Query) {
    return (
      left.firestore === right.firestore &&
      left._query.isEqual(right._query) &&
      left._converter === right._converter
    );
  }
  return false;
}

export function newUserDataReader(
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
