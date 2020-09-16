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

import { Document } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { FirebaseFirestore } from './database';
import {
  _DocumentKeyReference,
  ParsedUpdateData,
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs,
  UserDataReader
} from '../../../src/api/user_data_reader';
import {
  Bound,
  Direction,
  hasLimitToLast,
  LimitType,
  newQueryForCollectionGroup,
  newQueryForPath,
  Operator,
  Query as InternalQuery,
  queryEquals,
  queryWithAddedFilter,
  queryWithAddedOrderBy,
  queryWithEndAt,
  queryWithLimit,
  queryWithStartAt
} from '../../../src/core/query';
import {
  FieldPath as InternalFieldPath,
  ResourcePath
} from '../../../src/model/path';
import { AutoId } from '../../../src/util/misc';
import {
  DocumentSnapshot,
  fieldPathFromArgument,
  FirestoreDataConverter,
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
  newQueryBoundFromDocument,
  newQueryBoundFromFields,
  newQueryFilter,
  newQueryOrderBy,
  validateHasExplicitOrderByForLimitToLast
} from '../../../src/api/database';
import { FieldPath } from './field_path';
import {
  validateCollectionPath,
  validateDocumentPath,
  validateExactNumberOfArgs,
  validatePositiveNumber
} from '../../../src/util/input_validation';
import { newSerializer } from '../../../src/platform/serializer';
import { Code, FirestoreError } from '../../../src/util/error';
import { getDatastore } from './components';

export interface DocumentData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;
}

export interface UpdateData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [fieldPath: string]: any;
}

export type SetOptions =
  | {
      readonly merge?: boolean;
    }
  | {
      readonly mergeFields?: Array<string | FieldPath>;
    };

/**
 * A reference to a particular document in a collection in the database.
 */
export class DocumentReference<T = DocumentData> extends _DocumentKeyReference<
  T
> {
  readonly type = 'document';

  constructor(
    readonly firestore: FirebaseFirestore,
    readonly converter: FirestoreDataConverter<T> | null,
    readonly _path: ResourcePath
  ) {
    super(firestore._databaseId, new DocumentKey(_path), converter);
  }

  get id(): string {
    return this._path.lastSegment();
  }

  get path(): string {
    return this._path.canonicalString();
  }

  get parent(): CollectionReference<T> {
    return new CollectionReference<T>(
      this.firestore,
      this._converter,
      this._key.path.popLast()
    );
  }

  collection(path: string): CollectionReference<DocumentData> {
    validateNonEmptyArgument('DocumentReference.collection', 'path', path);
    const absolutePath = ResourcePath.fromString(this.path).child(
      ResourcePath.fromString(path)
    );
    validateCollectionPath(absolutePath);
    return new CollectionReference(
      this.firestore,
      /* converter= */ null,
      absolutePath
    );
  }

  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U> {
    return new DocumentReference<U>(this.firestore, converter, this._path);
  }
}

export class Query<T = DocumentData> {
  readonly type: 'query' | 'collection' = 'query';

  // This is the lite version of the Query class in the main SDK.
  constructor(
    readonly firestore: FirebaseFirestore,
    readonly converter: FirestoreDataConverter<T> | null,
    readonly _query: InternalQuery
  ) {}

  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U> {
    return new Query<U>(this.firestore, converter, this._query);
  }
}

export type QueryConstraintType =
  | 'where'
  | 'orderBy'
  | 'limit'
  | 'limitToLast'
  | 'startAt'
  | 'startAfter'
  | 'endAt'
  | 'endBefore';

export abstract class QueryConstraint {
  abstract readonly type: QueryConstraintType;

  /**
   * Takes the provided Query and returns a copy of the Query with this
   * QueryConstraint applied.
   */
  abstract _apply<T>(query: Query<T>): Query<T>;
}

export function query<T>(
  query: Query<T>,
  ...queryConstraints: QueryConstraint[]
): Query<T> {
  for (const constraint of queryConstraints) {
    query = constraint._apply(query);
  }
  return query;
}

class QueryFilterConstraint extends QueryConstraint {
  readonly type = 'where';

  constructor(
    private readonly _field: InternalFieldPath,
    private _op: Operator,
    private _value: unknown
  ) {
    super();
  }

  _apply<T>(query: Query<T>): Query<T> {
    const reader = newUserDataReader(query.firestore);
    const filter = newQueryFilter(
      query._query,
      'where',
      reader,
      query.firestore._databaseId,
      this._field,
      this._op,
      this._value
    );
    return new Query(
      query.firestore,
      query.converter,
      queryWithAddedFilter(query._query, filter)
    );
  }
}

export type WhereFilterOp =
  | '<'
  | '<='
  | '=='
  | '!='
  | '>='
  | '>'
  | 'array-contains'
  | 'in'
  | 'array-contains-any'
  | 'not-in';

export function where(
  fieldPath: string | FieldPath,
  opStr: WhereFilterOp,
  value: unknown
): QueryConstraint {
  // TODO(firestorelite): Consider validating the enum strings (note that
  // TypeScript does not support passing invalid values).
  const op = opStr as Operator;
  const field = fieldPathFromArgument('where', fieldPath);
  return new QueryFilterConstraint(field, op, value);
}

class QueryOrderByConstraint extends QueryConstraint {
  readonly type = 'orderBy';

  constructor(
    private readonly _field: InternalFieldPath,
    private _direction: Direction
  ) {
    super();
  }

  _apply<T>(query: Query<T>): Query<T> {
    const orderBy = newQueryOrderBy(query._query, this._field, this._direction);
    return new Query(
      query.firestore,
      query.converter,
      queryWithAddedOrderBy(query._query, orderBy)
    );
  }
}

export type OrderByDirection = 'desc' | 'asc';

export function orderBy(
  field: string | FieldPath,
  directionStr: OrderByDirection = 'asc'
): QueryConstraint {
  // TODO(firestorelite): Consider validating the enum strings (note that
  // TypeScript does not support passing invalid values).
  const direction = directionStr as Direction;
  const fieldPath = fieldPathFromArgument('orderBy', field);
  return new QueryOrderByConstraint(fieldPath, direction);
}

class QueryLimitConstraint extends QueryConstraint {
  constructor(
    readonly type: 'limit' | 'limitToLast',
    private readonly _limit: number,
    private readonly _limitType: LimitType
  ) {
    super();
  }

  _apply<T>(query: Query<T>): Query<T> {
    return new Query(
      query.firestore,
      query.converter,
      queryWithLimit(query._query, this._limit, this._limitType)
    );
  }
}

export function limit(n: number): QueryConstraint {
  validatePositiveNumber('limit', 1, n);
  return new QueryLimitConstraint('limit', n, LimitType.First);
}

export function limitToLast(n: number): QueryConstraint {
  validatePositiveNumber('limitToLast', 1, n);
  return new QueryLimitConstraint('limitToLast', n, LimitType.Last);
}

class QueryStartAtConstraint extends QueryConstraint {
  constructor(
    readonly type: 'startAt' | 'startAfter',
    private readonly _docOrFields: Array<unknown | DocumentSnapshot<unknown>>,
    private readonly _before: boolean
  ) {
    super();
  }

  _apply<T>(query: Query<T>): Query<T> {
    const bound = newQueryBoundFromDocOrFields(
      query,
      this.type,
      this._docOrFields,
      this._before
    );
    return new Query(
      query.firestore,
      query.converter,
      queryWithStartAt(query._query, bound)
    );
  }
}

export function startAt(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryStartAtConstraint('startAt', docOrFields, /*before=*/ true);
}

export function startAfter(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryStartAtConstraint(
    'startAfter',
    docOrFields,
    /*before=*/ false
  );
}

class QueryEndAtConstraint extends QueryConstraint {
  constructor(
    readonly type: 'endBefore' | 'endAt',
    private readonly _docOrFields: Array<unknown | DocumentSnapshot<unknown>>,
    private readonly _before: boolean
  ) {
    super();
  }

  _apply<T>(query: Query<T>): Query<T> {
    const bound = newQueryBoundFromDocOrFields(
      query,
      this.type,
      this._docOrFields,
      this._before
    );
    return new Query(
      query.firestore,
      query.converter,
      queryWithEndAt(query._query, bound)
    );
  }
}

export function endBefore(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryEndAtConstraint('endBefore', docOrFields, /*before=*/ true);
}

export function endAt(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryEndAtConstraint('endAt', docOrFields, /*before=*/ false);
}

/** Helper function to create a bound from a document or fields */
function newQueryBoundFromDocOrFields<T>(
  query: Query,
  methodName: string,
  docOrFields: Array<unknown | DocumentSnapshot<T>>,
  before: boolean
): Bound {
  if (docOrFields[0] instanceof DocumentSnapshot) {
    validateExactNumberOfArgs(methodName, docOrFields, 1);
    return newQueryBoundFromDocument(
      query._query,
      query.firestore._databaseId,
      methodName,
      docOrFields[0]._document,
      before
    );
  } else {
    const reader = newUserDataReader(query.firestore);
    return newQueryBoundFromFields(
      query._query,
      query.firestore._databaseId,
      reader,
      methodName,
      docOrFields,
      before
    );
  }
}

export class CollectionReference<T = DocumentData> extends Query<T> {
  readonly type = 'collection';

  constructor(
    readonly firestore: FirebaseFirestore,
    converter: FirestoreDataConverter<T> | null,
    readonly _path: ResourcePath
  ) {
    super(firestore, converter, newQueryForPath(_path));
  }

  get id(): string {
    return this._query.path.lastSegment();
  }

  get path(): string {
    return this._query.path.canonicalString();
  }

  get parent(): DocumentReference<DocumentData> | null {
    const parentPath = this._path.popLast();
    if (parentPath.isEmpty()) {
      return null;
    } else {
      return new DocumentReference(
        this.firestore,
        /* converter= */ null,
        parentPath
      );
    }
  }

  doc(path?: string): DocumentReference<T> {
    // We allow omission of 'pathString' but explicitly prohibit passing in both
    // 'undefined' and 'null'.
    if (arguments.length === 0) {
      path = AutoId.newId();
    }
    validateNonEmptyArgument('CollectionReference.doc', 'path', path);
    const absolutePath = this._path.child(ResourcePath.fromString(path!));
    validateDocumentPath(absolutePath);
    return new DocumentReference(this.firestore, this.converter, absolutePath);
  }

  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): CollectionReference<U> {
    return new CollectionReference<U>(this.firestore, converter, this._path);
  }
}

export function collection(
  firestore: FirebaseFirestore,
  collectionPath: string
): CollectionReference<DocumentData>;
export function collection(
  reference: CollectionReference<unknown>,
  collectionPath: string
): CollectionReference<DocumentData>;
export function collection(
  reference: DocumentReference,
  collectionPath: string
): CollectionReference<DocumentData>;
export function collection(
  parent:
    | FirebaseFirestore
    | DocumentReference<unknown>
    | CollectionReference<unknown>,
  relativePath: string
): CollectionReference<DocumentData> {
  validateNonEmptyArgument('collection', 'path', relativePath);
  if (parent instanceof FirebaseFirestore) {
    const absolutePath = ResourcePath.fromString(relativePath);
    validateCollectionPath(absolutePath);
    return new CollectionReference(parent, /* converter= */ null, absolutePath);
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
      /* converter= */ null,
      absolutePath
    );
  }
}

// TODO(firestorelite): Consider using ErrorFactory -
// https://github.com/firebase/firebase-js-sdk/blob/0131e1f/packages/util/src/errors.ts#L106
export function collectionGroup(
  firestore: FirebaseFirestore,
  collectionId: string
): Query<DocumentData> {
  validateNonEmptyArgument('collectionGroup', 'collection id', collectionId);
  if (collectionId.indexOf('/') >= 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid collection ID '${collectionId}' passed to function ` +
        `collectionGroup(). Collection IDs must not contain '/'.`
    );
  }

  return new Query(
    firestore,
    /* converter= */ null,
    newQueryForCollectionGroup(collectionId)
  );
}

export function doc(
  firestore: FirebaseFirestore,
  documentPath: string
): DocumentReference<DocumentData>;
export function doc<T>(
  reference: CollectionReference<T>,
  documentPath?: string
): DocumentReference<T>;
export function doc(
  reference: DocumentReference<unknown>,
  documentPath: string
): DocumentReference<DocumentData>;
export function doc<T>(
  parent:
    | FirebaseFirestore
    | CollectionReference<T>
    | DocumentReference<unknown>,
  relativePath?: string
): DocumentReference {
  // We allow omission of 'pathString' but explicitly prohibit passing in both
  // 'undefined' and 'null'.
  if (arguments.length === 1) {
    relativePath = AutoId.newId();
  }
  validateNonEmptyArgument('doc', 'path', relativePath);

  if (parent instanceof FirebaseFirestore) {
    const absolutePath = ResourcePath.fromString(relativePath);
    validateDocumentPath(absolutePath);
    return new DocumentReference(parent, /* converter= */ null, absolutePath);
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
      ResourcePath.fromString(relativePath)
    );
    validateDocumentPath(absolutePath);
    return new DocumentReference(
      parent.firestore,
      parent instanceof CollectionReference ? parent.converter : null,
      absolutePath
    );
  }
}

export function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  const datastore = getDatastore(reference.firestore);
  return invokeBatchGetDocumentsRpc(datastore, [reference._key]).then(
    result => {
      hardAssert(result.length === 1, 'Expected a single document result');
      const maybeDocument = result[0];
      return new DocumentSnapshot<T>(
        reference.firestore,
        reference._key,
        maybeDocument instanceof Document ? maybeDocument : null,
        reference._converter
      );
    }
  );
}

export function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>> {
  validateHasExplicitOrderByForLimitToLast(query._query);

  const datastore = getDatastore(query.firestore);
  return invokeRunQueryRpc(datastore, query._query).then(result => {
    const docs = result.map(
      doc =>
        new QueryDocumentSnapshot<T>(
          query.firestore,
          doc.key,
          doc,
          query.converter
        )
    );

    if (hasLimitToLast(query._query)) {
      // Limit to last queries reverse the orderBy constraint that was
      // specified by the user. As such, we need to reverse the order of the
      // results to return the documents in the expected order.
      docs.reverse();
    }

    return new QuerySnapshot<T>(query, docs);
  });
}

export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T
): Promise<void>;
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: Partial<T>,
  options: SetOptions
): Promise<void>;
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T,
  options?: SetOptions
): Promise<void> {
  const convertedValue = applyFirestoreDataConverter(
    reference._converter,
    data,
    options
  );
  const dataReader = newUserDataReader(reference.firestore);
  const parsed = parseSetData(
    dataReader,
    'setDoc',
    reference._key,
    convertedValue,
    reference._converter !== null,
    options
  );

  const datastore = getDatastore(reference.firestore);
  return invokeCommitRpc(
    datastore,
    parsed.toMutations(reference._key, Precondition.none())
  );
}

export function updateDoc(
  reference: DocumentReference<unknown>,
  data: UpdateData
): Promise<void>;
export function updateDoc(
  reference: DocumentReference<unknown>,
  field: string | FieldPath,
  value: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void>;
export function updateDoc(
  reference: DocumentReference<unknown>,
  fieldOrUpdateData: string | FieldPath | UpdateData,
  value?: unknown,
  ...moreFieldsAndValues: unknown[]
): Promise<void> {
  const dataReader = newUserDataReader(reference.firestore);

  let parsed: ParsedUpdateData;
  if (
    typeof fieldOrUpdateData === 'string' ||
    fieldOrUpdateData instanceof FieldPath
  ) {
    parsed = parseUpdateVarargs(
      dataReader,
      'updateDoc',
      reference._key,
      fieldOrUpdateData,
      value,
      moreFieldsAndValues
    );
  } else {
    parsed = parseUpdateData(
      dataReader,
      'updateDoc',
      reference._key,
      fieldOrUpdateData
    );
  }

  const datastore = getDatastore(reference.firestore);
  return invokeCommitRpc(
    datastore,
    parsed.toMutations(reference._key, Precondition.exists(true))
  );
}

export function deleteDoc(reference: DocumentReference): Promise<void> {
  const datastore = getDatastore(reference.firestore);
  return invokeCommitRpc(datastore, [
    new DeleteMutation(reference._key, Precondition.none())
  ]);
}

export function addDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>> {
  const docRef = doc(reference);

  const convertedValue = applyFirestoreDataConverter(reference.converter, data);

  const dataReader = newUserDataReader(reference.firestore);
  const parsed = parseSetData(
    dataReader,
    'addDoc',
    docRef._key,
    convertedValue,
    docRef._converter !== null,
    {}
  );

  const datastore = getDatastore(reference.firestore);
  return invokeCommitRpc(
    datastore,
    parsed.toMutations(docRef._key, Precondition.exists(false))
  ).then(() => docRef);
}

export function refEqual<T>(
  left: DocumentReference<T> | CollectionReference<T>,
  right: DocumentReference<T> | CollectionReference<T>
): boolean {
  if (
    (left instanceof DocumentReference ||
      left instanceof CollectionReference) &&
    (right instanceof DocumentReference || right instanceof CollectionReference)
  ) {
    return (
      left.firestore === right.firestore &&
      left.path === right.path &&
      left.converter === right.converter
    );
  }
  return false;
}

export function queryEqual<T>(left: Query<T>, right: Query<T>): boolean {
  if (left instanceof Query && right instanceof Query) {
    return (
      left.firestore === right.firestore &&
      queryEquals(left._query, right._query) &&
      left.converter === right.converter
    );
  }
  return false;
}

export function newUserDataReader(
  firestore: FirebaseFirestore
): UserDataReader {
  const settings = firestore._getSettings();
  const serializer = newSerializer(firestore._databaseId);
  return new UserDataReader(
    firestore._databaseId,
    !!settings.ignoreUndefinedProperties,
    serializer
  );
}

function validateNonEmptyArgument(
  functionName: string,
  argumentName: string,
  argument?: string
): asserts argument is string {
  if (!argument) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() cannot be called with an empty ${argumentName}.`
    );
  }
}
