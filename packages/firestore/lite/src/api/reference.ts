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

import * as firestore from '../../../lite-types';

import { Document } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { Firestore } from './database';
import {
  DocumentKeyReference,
  ParsedUpdateData,
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs,
  UserDataReader
} from '../../../src/api/user_data_reader';
import {
  Bound,
  Direction,
  Operator,
  Query as InternalQuery,
  queryEquals
} from '../../../src/core/query';
import { ResourcePath } from '../../../src/model/path';
import { AutoId } from '../../../src/util/misc';
import {
  DocumentSnapshot,
  fieldPathFromArgument,
  QueryDocumentSnapshot,
  QuerySnapshot
} from './snapshot';
import {
  invokeBatchGetDocumentsRpc,
  invokeCommitRpc,
  invokeRunQueryRpc
} from '../../../src/remote/datastore';
import { hardAssert } from '../../../src/util/assert';
import { DeleteMutation, Precondition } from '../../../src/model/mutation';
import {
  applyFirestoreDataConverter,
  BaseQuery,
  validateHasExplicitOrderByForLimitToLast
} from '../../../src/api/database';
import { FieldPath } from './field_path';
import { cast } from './util';
import {
  validateArgType,
  validateCollectionPath,
  validateDocumentPath,
  validateExactNumberOfArgs,
  validatePositiveNumber
} from '../../../src/util/input_validation';
import { newSerializer } from '../../../src/platform/serializer';
import { FieldPath as ExternalFieldPath } from '../../../src/api/field_path';
import { Code, FirestoreError } from '../../../src/util/error';
import { getDatastore } from './components';

/**
 * A reference to a particular document in a collection in the database.
 */
export class DocumentReference<T = firestore.DocumentData>
  extends DocumentKeyReference<T>
  implements firestore.DocumentReference<T> {
  readonly type = 'document';

  constructor(
    readonly firestore: Firestore,
    readonly _path: ResourcePath,
    readonly _converter: firestore.FirestoreDataConverter<T> | null
  ) {
    super(firestore._databaseId, new DocumentKey(_path), _converter);
  }

  get id(): string {
    return this._path.lastSegment();
  }

  get path(): string {
    return this._path.canonicalString();
  }

  withConverter<U>(
    converter: firestore.FirestoreDataConverter<U>
  ): firestore.DocumentReference<U> {
    return new DocumentReference<U>(this.firestore, this._path, converter);
  }
}

export class Query<T = firestore.DocumentData> extends BaseQuery
  implements firestore.Query<T> {
  readonly type: 'query' | 'collection' = 'query';

  // This is the lite version of the Query class in the main SDK.
  constructor(
    readonly firestore: Firestore,
    readonly _query: InternalQuery,
    readonly _converter: firestore.FirestoreDataConverter<T> | null
  ) {
    super(firestore._databaseId, newUserDataReader(firestore), _query);
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

  // TODO(firestiorelite): Consider making the Query methods tree-shakeable
  // (`Query.startAt()` would become `startAt(query)`).
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
      validateExactNumberOfArgs(methodName, [docOrField, ...fields], 1);
      return this.boundFromDocument(methodName, docOrField._document, before);
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
  readonly type = 'collection';

  constructor(
    readonly firestore: Firestore,
    readonly _path: ResourcePath,
    readonly _converter: firestore.FirestoreDataConverter<T> | null
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
  reference: firestore.CollectionReference<unknown>,
  collectionPath: string
): CollectionReference<firestore.DocumentData>;
export function collection(
  reference: firestore.DocumentReference,
  collectionPath: string
): CollectionReference<firestore.DocumentData>;
export function collection(
  parent:
    | firestore.FirebaseFirestore
    | firestore.DocumentReference<unknown>
    | firestore.CollectionReference<unknown>,
  relativePath: string
): CollectionReference<firestore.DocumentData> {
  validateArgType('collection', 'non-empty string', 2, relativePath);
  if (parent instanceof Firestore) {
    const absolutePath = ResourcePath.fromString(relativePath);
    validateCollectionPath(absolutePath);
    return new CollectionReference(parent, absolutePath, /* converter= */ null);
  } else {
    if (
      !(parent instanceof DocumentReference) &&
      !(parent instanceof CollectionReference)
    ) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Expected first argument to collection() to be a CollectionReference, ' +
          'a DocumentReference or FirebaseFirestore'
      );
    }
    const absolutePath = ResourcePath.fromString(parent.path).child(
      ResourcePath.fromString(relativePath)
    );
    validateCollectionPath(absolutePath);
    return new CollectionReference(
      parent.firestore,
      absolutePath,
      /* converter= */ null
    );
  }
}

// TODO(firestorelite): Consider using ErrorFactory -
// https://github.com/firebase/firebase-js-sdk/blob/0131e1f/packages/util/src/errors.ts#L106
export function collectionGroup(
  firestore: firestore.FirebaseFirestore,
  collectionId: string
): Query<firestore.DocumentData> {
  const firestoreClient = cast(firestore, Firestore);

  validateArgType('collectionGroup', 'non-empty string', 1, collectionId);
  if (collectionId.indexOf('/') >= 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid collection ID '${collectionId}' passed to function ` +
        `collectionGroup(). Collection IDs must not contain '/'.`
    );
  }

  return new Query(
    firestoreClient,
    new InternalQuery(ResourcePath.emptyPath(), collectionId),
    /* converter= */ null
  );
}

export function doc(
  firestore: firestore.FirebaseFirestore,
  documentPath: string
): DocumentReference<firestore.DocumentData>;
export function doc<T>(
  reference: firestore.CollectionReference<T>,
  documentPath?: string
): DocumentReference<T>;
export function doc(
  reference: firestore.DocumentReference<unknown>,
  documentPath: string
): DocumentReference<firestore.DocumentData>;
export function doc<T>(
  parent:
    | firestore.FirebaseFirestore
    | firestore.CollectionReference<T>
    | firestore.DocumentReference<unknown>,
  relativePath?: string
): DocumentReference {
  // We allow omission of 'pathString' but explicitly prohibit passing in both
  // 'undefined' and 'null'.
  if (arguments.length === 1) {
    relativePath = AutoId.newId();
  }
  validateArgType('doc', 'non-empty string', 2, relativePath);

  if (parent instanceof Firestore) {
    const absolutePath = ResourcePath.fromString(relativePath!);
    validateDocumentPath(absolutePath);
    return new DocumentReference(parent, absolutePath, /* converter= */ null);
  } else {
    if (
      !(parent instanceof DocumentReference) &&
      !(parent instanceof CollectionReference)
    ) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Expected first argument to collection() to be a CollectionReference, ' +
          'a DocumentReference or FirebaseFirestore'
      );
    }
    const absolutePath = parent._path.child(
      ResourcePath.fromString(relativePath!)
    );
    validateDocumentPath(absolutePath);
    return new DocumentReference(
      parent.firestore,
      absolutePath,
      parent instanceof CollectionReference ? parent._converter : null
    );
  }
}

export function parent(
  reference: firestore.CollectionReference<unknown>
): DocumentReference<firestore.DocumentData> | null;
export function parent<T>(
  reference: firestore.DocumentReference<T>
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
        parentPath,
        /* converter= */ null
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
  return getDatastore(ref.firestore).then(async datastore => {
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

// TODO(firestorelite): Consider renaming to getDocs
export function getQuery<T>(
  query: firestore.Query<T>
): Promise<firestore.QuerySnapshot<T>> {
  const internalQuery = cast<Query<T>>(query, Query);
  validateHasExplicitOrderByForLimitToLast(internalQuery._query);
  return getDatastore(internalQuery.firestore).then(async datastore => {
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
  const ref = cast<DocumentReference<T>>(reference, DocumentReference);

  const convertedValue = applyFirestoreDataConverter(
    ref._converter,
    data,
    options
  );
  const dataReader = newUserDataReader(ref.firestore);
  const parsed = parseSetData(
    dataReader,
    'setDoc',
    ref._key,
    convertedValue,
    ref._converter !== null,
    options
  );

  return getDatastore(ref.firestore).then(datastore =>
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
  const ref = cast<DocumentReference<unknown>>(reference, DocumentReference);
  const dataReader = newUserDataReader(ref.firestore);

  let parsed: ParsedUpdateData;
  if (
    typeof fieldOrUpdateData === 'string' ||
    fieldOrUpdateData instanceof FieldPath
  ) {
    parsed = parseUpdateVarargs(
      dataReader,
      'updateDoc',
      ref._key,
      fieldOrUpdateData,
      value,
      moreFieldsAndValues
    );
  } else {
    parsed = parseUpdateData(
      dataReader,
      'updateDoc',
      ref._key,
      fieldOrUpdateData
    );
  }

  return getDatastore(ref.firestore).then(datastore =>
    invokeCommitRpc(
      datastore,
      parsed.toMutations(ref._key, Precondition.exists(true))
    )
  );
}

export function deleteDoc(
  reference: firestore.DocumentReference
): Promise<void> {
  const ref = cast<DocumentReference<unknown>>(reference, DocumentReference);
  return getDatastore(ref.firestore).then(datastore =>
    invokeCommitRpc(datastore, [
      new DeleteMutation(ref._key, Precondition.none())
    ])
  );
}

export function addDoc<T>(
  reference: firestore.CollectionReference<T>,
  data: T
): Promise<firestore.DocumentReference<T>> {
  const collRef = cast<CollectionReference<T>>(reference, CollectionReference);
  const docRef = doc(collRef);

  const convertedValue = applyFirestoreDataConverter(collRef._converter, data);

  const dataReader = newUserDataReader(collRef.firestore);
  const parsed = parseSetData(
    dataReader,
    'addDoc',
    docRef._key,
    convertedValue,
    docRef._converter !== null,
    {}
  );

  return getDatastore(collRef.firestore)
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
      queryEquals(left._query, right._query) &&
      left._converter === right._converter
    );
  }
  return false;
}

export function newUserDataReader(firestore: Firestore): UserDataReader {
  const settings = firestore._getSettings();
  const serializer = newSerializer(firestore._databaseId);
  return new UserDataReader(
    firestore._databaseId,
    !!settings.ignoreUndefinedProperties,
    serializer
  );
}
