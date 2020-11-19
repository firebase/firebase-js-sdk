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

import { Value as ProtoValue } from '../../../src/protos/firestore_proto_api';

import { Document } from '../../../src/model/document';
import { DocumentKey } from '../../../src/model/document_key';
import { FirebaseFirestore } from './database';
import {
  ParsedUpdateData,
  parseQueryValue,
  parseSetData,
  parseUpdateData,
  parseUpdateVarargs,
  UserDataReader
} from '../../../src/api/user_data_reader';
import {
  Bound,
  Direction,
  FieldFilter,
  Filter,
  findFilterOperator,
  getFirstOrderByField,
  getInequalityFilterField,
  hasLimitToLast,
  isCollectionGroupQuery,
  LimitType,
  newQueryForCollectionGroup,
  newQueryForPath,
  Operator,
  OrderBy,
  Query as InternalQuery,
  queryEquals,
  queryOrderBy,
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
import { debugAssert, hardAssert } from '../../../src/util/assert';
import { DeleteMutation, Precondition } from '../../../src/model/mutation';
import { applyFirestoreDataConverter } from '../../../src/api/database';
import { FieldPath } from './field_path';
import {
  validateCollectionPath,
  validateDocumentPath,
  validateNonEmptyArgument,
  validatePositiveNumber,
  valueDescription
} from '../../../src/util/input_validation';
import { newSerializer } from '../../../src/platform/serializer';
import { Code, FirestoreError } from '../../../src/util/error';
import { getDatastore } from './components';
import { ByteString } from '../../../src/util/byte_string';
import { Bytes } from './bytes';
import { AbstractUserDataWriter } from '../../../src/api/user_data_writer';
import { Compat } from '../../../src/compat/compat';
import { DatabaseId } from '../../../src/core/database_info';
import { refValue } from '../../../src/model/values';
import { DocumentReference as ExpDocumentReference } from '../../../exp/src/api/reference';
import { isServerTimestamp } from '../../../src/model/server_timestamps';

/**
 * Document data (for use with {@link setDoc()}) consists of fields mapped to
 * values.
 */
export interface DocumentData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [field: string]: any;
}

/**
 * Update data (for use with {@link updateDoc()}) consists of field paths (e.g.
 * 'foo' or 'foo.baz') mapped to values. Fields that contain dots reference
 * nested fields within the document.
 */
export interface UpdateData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [fieldPath: string]: any;
}

/**
 * An options object that configures the behavior of {@link setDoc()}, {@link
 * WriteBatch#set()} and {@link Transaction#set()} calls. These calls can be
 * configured to perform granular merges instead of overwriting the target
 * documents in their entirety by providing a `SetOptions` with `merge: true`.
 *
 * @param merge Changes the behavior of a `setDoc()` call to only replace the
 * values specified in its data argument. Fields omitted from the `setDoc()`
 * call remain untouched.
 * @param mergeFields Changes the behavior of `setDoc()` calls to only replace
 * the specified field paths. Any field path that is not specified is ignored
 * and remains untouched.
 */
export type SetOptions =
  | {
      readonly merge?: boolean;
    }
  | {
      readonly mergeFields?: Array<string | FieldPath>;
    };

/**
 * A `DocumentReference` refers to a document location in a Firestore database
 * and can be used to write, read, or listen to the location. The document at
 * the referenced location may or may not exist.
 */
export class DocumentReference<T = DocumentData> {
  /** The type of this Firestore reference. */
  readonly type = 'document';

  /**
   * The {@link FirebaseFirestore} the document is in.
   * This is useful for performing transactions, for example.
   */
  readonly firestore: FirebaseFirestore;

  /** @hideconstructor */
  constructor(
    firestore: FirebaseFirestore,
    readonly _converter: FirestoreDataConverter<T> | null,
    readonly _key: DocumentKey
  ) {
    this.firestore = firestore;
  }

  get _path(): ResourcePath {
    return this._key.path;
  }

  /**
   * The document's identifier within its collection.
   */
  get id(): string {
    return this._key.path.lastSegment();
  }

  /**
   * A string representing the path of the referenced document (relative
   * to the root of the database).
   */
  get path(): string {
    return this._key.path.canonicalString();
  }

  /**
   * The collection this `DocumentReference` belongs to.
   */
  get parent(): CollectionReference<T> {
    return new CollectionReference<T>(
      this.firestore,
      this._converter,
      this._key.path.popLast()
    );
  }

  /**
   * Applies a custom data converter to this `DocumentReference`, allowing you
   * to use your own custom model objects with Firestore. When you call {@link
   * setDoc()}, {@link getDoc()}, etc. with the returned `DocumentReference`
   * instance, the provided converter will convert between Firestore data and
   * your custom type `U`.
   *
   * @param converter Converts objects to and from Firestore.
   * @return A `DocumentReference<U>` that uses the provided converter.
   */
  withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U> {
    return new DocumentReference<U>(this.firestore, converter, this._key);
  }
}

/**
 * A `Query` refers to a Query which you can read or listen to. You can also
 * construct refined `Query` objects by adding filters and ordering.
 */
export class Query<T = DocumentData> {
  /** The type of this Firestore reference. */
  readonly type: 'query' | 'collection' = 'query';

  /**
   * The `FirebaseFirestore` for the Firestore database (useful for performing
   * transactions, etc.).
   */
  readonly firestore: FirebaseFirestore;

  // This is the lite version of the Query class in the main SDK.

  /** @hideconstructor protected */
  constructor(
    firestore: FirebaseFirestore,
    readonly _converter: FirestoreDataConverter<T> | null,
    readonly _query: InternalQuery
  ) {
    this.firestore = firestore;
  }

  /**
   * Applies a custom data converter to this query, allowing you to use your own
   * custom model objects with Firestore. When you call {@link getDocs()} with
   * the returned query, the provided converter will convert between Firestore
   * data and your custom type `U`.
   *
   * @param converter Converts objects to and from Firestore.
   * @return A `Query<U>` that uses the provided converter.
   */
  withConverter<U>(converter: FirestoreDataConverter<U>): Query<U> {
    return new Query<U>(this.firestore, converter, this._query);
  }
}

/** Describes the different query constraints available in this SDK. */
export type QueryConstraintType =
  | 'where'
  | 'orderBy'
  | 'limit'
  | 'limitToLast'
  | 'startAt'
  | 'startAfter'
  | 'endAt'
  | 'endBefore';

/**
 * A `QueryConstraint` is used to narrow the set of documents returned by a
 * Firestore query. `QueryConstraint`s are created by invoking {@link where()},
 * {@link orderBy()}, {@link startAt()}, {@link startAfter()}, {@link
 * endBefore()}, {@link endAt()}, {@link limit()} or {@link limitToLast()} and
 * can then be passed to {@link query()} to create a new query instance that
 * also contains this `QueryConstraint`.
 */
export abstract class QueryConstraint {
  /** The type of this query constraints */
  abstract readonly type: QueryConstraintType;

  /**
   * Takes the provided `Query` and returns a copy of the `Query` with this
   * `QueryConstraint` applied.
   */
  abstract _apply<T>(query: Query<T>): Query<T>;
}

/**
 * Creates a new immutable instance of `query` that is extended to also include
 * additional query constraints.
 *
 * @param query The query instance to use as a base for the new constraints.
 * @param queryConstraints The list of `QueryConstraint`s to apply.
 * @throws if any of the provided query constraints cannot be combined with the
 * existing or new constraints.
 */
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
      query._converter,
      queryWithAddedFilter(query._query, filter)
    );
  }
}

/**
 * Filter conditions in a {@link where()} clause are specified using the
 * strings '<', '<=', '==', '!=', '>=', '>', 'array-contains', 'in',
 * 'array-contains-any', and 'not-in'.
 */
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

/**
 * Creates a `QueryConstraint` that enforces that documents must contain the
 * specified field and that the value should satisfy the relation constraint
 * provided.
 *
 * @param fieldPath The path to compare
 * @param opStr The operation string (e.g "<", "<=", "==", ">", ">=", "!=").
 * @param value The value for comparison
 * @return The created `Query`.
 */
export function where(
  fieldPath: string | FieldPath,
  opStr: WhereFilterOp,
  value: unknown
): QueryConstraint {
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
      query._converter,
      queryWithAddedOrderBy(query._query, orderBy)
    );
  }
}

/**
 * The direction of a {@link orderBy()} clause is specified as 'desc' or 'asc'
 * (descending or ascending).
 */
export type OrderByDirection = 'desc' | 'asc';

/**
 * Creates a `QueryConstraint` that sorts the query result by the
 * specified field, optionally in descending order instead of ascending.
 *
 * @param fieldPath The field to sort by.
 * @param directionStr Optional direction to sort by ('asc' or 'desc'). If
 * not specified, order will be ascending.
 * @return The created `Query`.
 */
export function orderBy(
  fieldPath: string | FieldPath,
  directionStr: OrderByDirection = 'asc'
): QueryConstraint {
  const direction = directionStr as Direction;
  const path = fieldPathFromArgument('orderBy', fieldPath);
  return new QueryOrderByConstraint(path, direction);
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
      query._converter,
      queryWithLimit(query._query, this._limit, this._limitType)
    );
  }
}

/**
 * Creates a `QueryConstraint` that only returns the first matching documents.
 *
 * @param limit The maximum number of items to return.
 * @return The created `Query`.
 */
export function limit(limit: number): QueryConstraint {
  validatePositiveNumber('limit', limit);
  return new QueryLimitConstraint('limit', limit, LimitType.First);
}

/**
 * Creates a `QueryConstraint` that only returns the last matching documents.
 *
 * You must specify at least one `orderBy` clause for `limitToLast` queries,
 * otherwise an exception will be thrown during execution.
 *
 * @param limit The maximum number of items to return.
 * @return The created `Query`.
 */
export function limitToLast(limit: number): QueryConstraint {
  validatePositiveNumber('limitToLast', limit);
  return new QueryLimitConstraint('limitToLast', limit, LimitType.Last);
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
      query._converter,
      queryWithStartAt(query._query, bound)
    );
  }
}

/**
 * Creates a `QueryConstraint` that modifies the result set to start at the
 * provided document (inclusive). The starting position is relative to the order
 * of the query. The document must contain all of the fields provided in the
 * `orderBy` of this query.
 *
 * @param snapshot The snapshot of the document to start at.
 * @return A `QueryConstraint` to pass to `query()`.
 */
export function startAt(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to start at the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to start this query at, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`.
 */
export function startAt(...fieldValues: unknown[]): QueryConstraint;
export function startAt(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryStartAtConstraint('startAt', docOrFields, /*before=*/ true);
}

/**
 * Creates a `QueryConstraint` that modifies the result set to start after the
 * provided document (exclusive). The starting position is relative to the order
 * of the query. The document must contain all of the fields provided in the
 * orderBy of the query.
 *
 * @param snapshot The snapshot of the document to start after.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function startAfter(
  snapshot: DocumentSnapshot<unknown>
): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to start after the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to start this query after, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function startAfter(...fieldValues: unknown[]): QueryConstraint;
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
      query._converter,
      queryWithEndAt(query._query, bound)
    );
  }
}

/**
 * Creates a `QueryConstraint` that modifies the result set to end before the
 * provided document (exclusive). The end position is relative to the order of
 * the query. The document must contain all of the fields provided in the
 * orderBy of the query.
 *
 * @param snapshot The snapshot of the document to end before.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function endBefore(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to end before the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to end this query before, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function endBefore(...fieldValues: unknown[]): QueryConstraint;
export function endBefore(
  ...docOrFields: Array<unknown | DocumentSnapshot<unknown>>
): QueryConstraint {
  return new QueryEndAtConstraint('endBefore', docOrFields, /*before=*/ true);
}

/**
 * Creates a `QueryConstraint` that modifies the result set to end at the
 * provided document (inclusive). The end position is relative to the order of
 * the query. The document must contain all of the fields provided in the
 * orderBy of the query.
 *
 * @param snapshot The snapshot of the document to end at.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function endAt(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to end at the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues The field values to end this query at, in order
 * of the query's order by.
 * @return A `QueryConstraint` to pass to `query()`
 */
export function endAt(...fieldValues: unknown[]): QueryConstraint;
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
  if (docOrFields[0] instanceof Compat) {
    docOrFields[0] = docOrFields[0]._delegate;
  }

  if (docOrFields[0] instanceof DocumentSnapshot) {
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

export function newQueryFilter(
  query: InternalQuery,
  methodName: string,
  dataReader: UserDataReader,
  databaseId: DatabaseId,
  fieldPath: InternalFieldPath,
  op: Operator,
  value: unknown
): FieldFilter {
  let fieldValue: ProtoValue;
  if (fieldPath.isKeyField()) {
    if (op === Operator.ARRAY_CONTAINS || op === Operator.ARRAY_CONTAINS_ANY) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid Query. You can't perform '${op}' ` +
          'queries on FieldPath.documentId().'
      );
    } else if (op === Operator.IN || op === Operator.NOT_IN) {
      validateDisjunctiveFilterElements(value, op);
      const referenceList: ProtoValue[] = [];
      for (const arrayValue of value as ProtoValue[]) {
        referenceList.push(parseDocumentIdValue(databaseId, query, arrayValue));
      }
      fieldValue = { arrayValue: { values: referenceList } };
    } else {
      fieldValue = parseDocumentIdValue(databaseId, query, value);
    }
  } else {
    if (
      op === Operator.IN ||
      op === Operator.NOT_IN ||
      op === Operator.ARRAY_CONTAINS_ANY
    ) {
      validateDisjunctiveFilterElements(value, op);
    }
    fieldValue = parseQueryValue(
      dataReader,
      methodName,
      value,
      /* allowArrays= */ op === Operator.IN || op === Operator.NOT_IN
    );
  }
  const filter = FieldFilter.create(fieldPath, op, fieldValue);
  validateNewFilter(query, filter);
  return filter;
}

export function newQueryOrderBy(
  query: InternalQuery,
  fieldPath: InternalFieldPath,
  direction: Direction
): OrderBy {
  if (query.startAt !== null) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Invalid query. You must not call startAt() or startAfter() before ' +
        'calling orderBy().'
    );
  }
  if (query.endAt !== null) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Invalid query. You must not call endAt() or endBefore() before ' +
        'calling orderBy().'
    );
  }
  const orderBy = new OrderBy(fieldPath, direction);
  validateNewOrderBy(query, orderBy);
  return orderBy;
}

/**
 * Create a Bound from a query and a document.
 *
 * Note that the Bound will always include the key of the document
 * and so only the provided document will compare equal to the returned
 * position.
 *
 * Will throw if the document does not contain all fields of the order by
 * of the query or if any of the fields in the order by are an uncommitted
 * server timestamp.
 */
export function newQueryBoundFromDocument(
  query: InternalQuery,
  databaseId: DatabaseId,
  methodName: string,
  doc: Document | null,
  before: boolean
): Bound {
  if (!doc) {
    throw new FirestoreError(
      Code.NOT_FOUND,
      `Can't use a DocumentSnapshot that doesn't exist for ` +
        `${methodName}().`
    );
  }

  const components: ProtoValue[] = [];

  // Because people expect to continue/end a query at the exact document
  // provided, we need to use the implicit sort order rather than the explicit
  // sort order, because it's guaranteed to contain the document key. That way
  // the position becomes unambiguous and the query continues/ends exactly at
  // the provided document. Without the key (by using the explicit sort
  // orders), multiple documents could match the position, yielding duplicate
  // results.
  for (const orderBy of queryOrderBy(query)) {
    if (orderBy.field.isKeyField()) {
      components.push(refValue(databaseId, doc.key));
    } else {
      const value = doc.field(orderBy.field);
      if (isServerTimestamp(value)) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          'Invalid query. You are trying to start or end a query using a ' +
            'document for which the field "' +
            orderBy.field +
            '" is an uncommitted server timestamp. (Since the value of ' +
            'this field is unknown, you cannot start/end a query with it.)'
        );
      } else if (value !== null) {
        components.push(value);
      } else {
        const field = orderBy.field.canonicalString();
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid query. You are trying to start or end a query using a ` +
            `document for which the field '${field}' (used as the ` +
            `orderBy) does not exist.`
        );
      }
    }
  }
  return new Bound(components, before);
}

/**
 * Converts a list of field values to a Bound for the given query.
 */
export function newQueryBoundFromFields(
  query: InternalQuery,
  databaseId: DatabaseId,
  dataReader: UserDataReader,
  methodName: string,
  values: unknown[],
  before: boolean
): Bound {
  // Use explicit order by's because it has to match the query the user made
  const orderBy = query.explicitOrderBy;
  if (values.length > orderBy.length) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Too many arguments provided to ${methodName}(). ` +
        `The number of arguments must be less than or equal to the ` +
        `number of orderBy() clauses`
    );
  }

  const components: ProtoValue[] = [];
  for (let i = 0; i < values.length; i++) {
    const rawValue = values[i];
    const orderByComponent = orderBy[i];
    if (orderByComponent.field.isKeyField()) {
      if (typeof rawValue !== 'string') {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid query. Expected a string for document ID in ` +
            `${methodName}(), but got a ${typeof rawValue}`
        );
      }
      if (!isCollectionGroupQuery(query) && rawValue.indexOf('/') !== -1) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid query. When querying a collection and ordering by FieldPath.documentId(), ` +
            `the value passed to ${methodName}() must be a plain document ID, but ` +
            `'${rawValue}' contains a slash.`
        );
      }
      const path = query.path.child(ResourcePath.fromString(rawValue));
      if (!DocumentKey.isDocumentKey(path)) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid query. When querying a collection group and ordering by ` +
            `FieldPath.documentId(), the value passed to ${methodName}() must result in a ` +
            `valid document path, but '${path}' is not because it contains an odd number ` +
            `of segments.`
        );
      }
      const key = new DocumentKey(path);
      components.push(refValue(databaseId, key));
    } else {
      const wrapped = parseQueryValue(dataReader, methodName, rawValue);
      components.push(wrapped);
    }
  }

  return new Bound(components, before);
}

/**
 * Parses the given documentIdValue into a ReferenceValue, throwing
 * appropriate errors if the value is anything other than a DocumentReference
 * or String, or if the string is malformed.
 */
function parseDocumentIdValue(
  databaseId: DatabaseId,
  query: InternalQuery,
  documentIdValue: unknown
): ProtoValue {
  if (documentIdValue instanceof Compat) {
    documentIdValue = documentIdValue._delegate;
  }

  if (typeof documentIdValue === 'string') {
    if (documentIdValue === '') {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. When querying with FieldPath.documentId(), you ' +
          'must provide a valid document ID, but it was an empty string.'
      );
    }
    if (!isCollectionGroupQuery(query) && documentIdValue.indexOf('/') !== -1) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid query. When querying a collection by ` +
          `FieldPath.documentId(), you must provide a plain document ID, but ` +
          `'${documentIdValue}' contains a '/' character.`
      );
    }
    const path = query.path.child(ResourcePath.fromString(documentIdValue));
    if (!DocumentKey.isDocumentKey(path)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid query. When querying a collection group by ` +
          `FieldPath.documentId(), the value provided must result in a valid document path, ` +
          `but '${path}' is not because it has an odd number of segments (${path.length}).`
      );
    }
    return refValue(databaseId, new DocumentKey(path));
  } else if (documentIdValue instanceof ExpDocumentReference) {
    return refValue(databaseId, documentIdValue._key);
  } else {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid query. When querying with FieldPath.documentId(), you must provide a valid ` +
        `string or a DocumentReference, but it was: ` +
        `${valueDescription(documentIdValue)}.`
    );
  }
}

/**
 * Validates that the value passed into a disjunctive filter satisfies all
 * array requirements.
 */
function validateDisjunctiveFilterElements(
  value: unknown,
  operator: Operator
): void {
  if (!Array.isArray(value) || value.length === 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'Invalid Query. A non-empty array is required for ' +
        `'${operator.toString()}' filters.`
    );
  }
  if (value.length > 10) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid Query. '${operator.toString()}' filters support a ` +
        'maximum of 10 elements in the value array.'
    );
  }
}

/**
 * Given an operator, returns the set of operators that cannot be used with it.
 *
 * Operators in a query must adhere to the following set of rules:
 * 1. Only one array operator is allowed.
 * 2. Only one disjunctive operator is allowed.
 * 3. NOT_EQUAL cannot be used with another NOT_EQUAL operator.
 * 4. NOT_IN cannot be used with array, disjunctive, or NOT_EQUAL operators.
 *
 * Array operators: ARRAY_CONTAINS, ARRAY_CONTAINS_ANY
 * Disjunctive operators: IN, ARRAY_CONTAINS_ANY, NOT_IN
 */
function conflictingOps(op: Operator): Operator[] {
  switch (op) {
    case Operator.NOT_EQUAL:
      return [Operator.NOT_EQUAL, Operator.NOT_IN];
    case Operator.ARRAY_CONTAINS:
      return [
        Operator.ARRAY_CONTAINS,
        Operator.ARRAY_CONTAINS_ANY,
        Operator.NOT_IN
      ];
    case Operator.IN:
      return [Operator.ARRAY_CONTAINS_ANY, Operator.IN, Operator.NOT_IN];
    case Operator.ARRAY_CONTAINS_ANY:
      return [
        Operator.ARRAY_CONTAINS,
        Operator.ARRAY_CONTAINS_ANY,
        Operator.IN,
        Operator.NOT_IN
      ];
    case Operator.NOT_IN:
      return [
        Operator.ARRAY_CONTAINS,
        Operator.ARRAY_CONTAINS_ANY,
        Operator.IN,
        Operator.NOT_IN,
        Operator.NOT_EQUAL
      ];
    default:
      return [];
  }
}

function validateNewFilter(query: InternalQuery, filter: Filter): void {
  debugAssert(filter instanceof FieldFilter, 'Only FieldFilters are supported');

  if (filter.isInequality()) {
    const existingField = getInequalityFilterField(query);
    if (existingField !== null && !existingField.isEqual(filter.field)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. All where filters with an inequality' +
          ' (<, <=, >, or >=) must be on the same field. But you have' +
          ` inequality filters on '${existingField.toString()}'` +
          ` and '${filter.field.toString()}'`
      );
    }

    const firstOrderByField = getFirstOrderByField(query);
    if (firstOrderByField !== null) {
      validateOrderByAndInequalityMatch(query, filter.field, firstOrderByField);
    }
  }

  const conflictingOp = findFilterOperator(query, conflictingOps(filter.op));
  if (conflictingOp !== null) {
    // Special case when it's a duplicate op to give a slightly clearer error message.
    if (conflictingOp === filter.op) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. You cannot use more than one ' +
          `'${filter.op.toString()}' filter.`
      );
    } else {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid query. You cannot use '${filter.op.toString()}' filters ` +
          `with '${conflictingOp.toString()}' filters.`
      );
    }
  }
}

function validateNewOrderBy(query: InternalQuery, orderBy: OrderBy): void {
  if (getFirstOrderByField(query) === null) {
    // This is the first order by. It must match any inequality.
    const inequalityField = getInequalityFilterField(query);
    if (inequalityField !== null) {
      validateOrderByAndInequalityMatch(query, inequalityField, orderBy.field);
    }
  }
}

function validateOrderByAndInequalityMatch(
  baseQuery: InternalQuery,
  inequality: InternalFieldPath,
  orderBy: InternalFieldPath
): void {
  if (!orderBy.isEqual(inequality)) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid query. You have a where filter with an inequality ` +
        `(<, <=, >, or >=) on field '${inequality.toString()}' ` +
        `and so you must also use '${inequality.toString()}' ` +
        `as your first argument to orderBy(), but your first orderBy() ` +
        `is on field '${orderBy.toString()}' instead.`
    );
  }
}

export function validateHasExplicitOrderByForLimitToLast(
  query: InternalQuery
): void {
  if (hasLimitToLast(query) && query.explicitOrderBy.length === 0) {
    throw new FirestoreError(
      Code.UNIMPLEMENTED,
      'limitToLast() queries require specifying at least one orderBy() clause'
    );
  }
}

/**
 * A `CollectionReference` object can be used for adding documents, getting
 * document references, and querying for documents (using {@link query()}`).
 */
export class CollectionReference<T = DocumentData> extends Query<T> {
  readonly type = 'collection';

  /** @hideconstructor */
  constructor(
    readonly firestore: FirebaseFirestore,
    converter: FirestoreDataConverter<T> | null,
    readonly _path: ResourcePath
  ) {
    super(firestore, converter, newQueryForPath(_path));
  }

  /** The collection's identifier. */
  get id(): string {
    return this._query.path.lastSegment();
  }

  /**
   * A string representing the path of the referenced collection (relative
   * to the root of the database).
   */
  get path(): string {
    return this._query.path.canonicalString();
  }

  /**
   * A reference to the containing `DocumentReference` if this is a
   * subcollection. If this isn't a subcollection, the reference is null.
   */
  get parent(): DocumentReference<DocumentData> | null {
    const parentPath = this._path.popLast();
    if (parentPath.isEmpty()) {
      return null;
    } else {
      return new DocumentReference(
        this.firestore,
        /* converter= */ null,
        new DocumentKey(parentPath)
      );
    }
  }

  /**
   * Applies a custom data converter to this CollectionReference, allowing you
   * to use your own custom model objects with Firestore. When you call {@link
   * addDoc()} with the returned `CollectionReference` instance, the provided
   * converter will convert between Firestore data and your custom type `U`.
   *
   * @param converter Converts objects to and from Firestore.
   * @return A `CollectionReference<U>` that uses the provided converter.
   */
  withConverter<U>(
    converter: FirestoreDataConverter<U>
  ): CollectionReference<U> {
    return new CollectionReference<U>(this.firestore, converter, this._path);
  }
}

/**
 * Gets a `CollectionReference` instance that refers to the collection at
 * the specified absolute path.
 *
 * @param firestore A reference to the root Firestore instance.
 * @param path A slash-separated path to a collection.
 * @param pathSegments Additional path segments to apply relative to the first
 * argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @return The `CollectionReference` instance.
 */
export function collection(
  firestore: FirebaseFirestore,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
/**
 * Gets a `CollectionReference` instance that refers to a subcollection of
 * `reference` at the the specified relative path.
 *
 * @param reference A reference to a collection.
 * @param path A slash-separated path to a collection.
 * @param pathSegments Additional path segments to apply relative to the first
 * argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @return The `CollectionReference` instance.
 */
export function collection(
  reference: CollectionReference<unknown>,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
/**
 * Gets a `CollectionReference` instance that refers to a subcollection of
 * `reference` at the the specified relative path.
 *
 * @param reference A reference to a Firestore document.
 * @param path A slash-separated path to a collection.
 * @param pathSegments Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an even number of segments and does not point
 * to a collection.
 * @return The `CollectionReference` instance.
 */
export function collection(
  reference: DocumentReference,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData>;
export function collection(
  parent:
    | FirebaseFirestore
    | DocumentReference<unknown>
    | CollectionReference<unknown>,
  path: string,
  ...pathSegments: string[]
): CollectionReference<DocumentData> {
  validateNonEmptyArgument('collection', 'path', path);
  if (parent instanceof FirebaseFirestore) {
    const absolutePath = ResourcePath.fromString(path, ...pathSegments);
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
    const absolutePath = ResourcePath.fromString(
      parent.path,
      ...pathSegments
    ).child(ResourcePath.fromString(path));
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

/**
 * Creates and returns a new `Query` instance that includes all documents in the
 * database that are contained in a collection or subcollection with the
 * given `collectionId`.
 *
 * @param firestore A reference to the root Firestore instance.
 * @param collectionId Identifies the collections to query over. Every
 * collection or subcollection with this ID as the last segment of its path
 * will be included. Cannot contain a slash.
 * @return The created `Query`.
 */
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

/**
 * Gets a `DocumentReference` instance that refers to the document at the
 * specified abosulute path.
 *
 * @param firestore A reference to the root Firestore instance.
 * @param path A slash-separated path to a document.
 * @param pathSegments Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @return The `DocumentReference` instance.
 */
export function doc(
  firestore: FirebaseFirestore,
  path: string,
  ...pathSegments: string[]
): DocumentReference<DocumentData>;
/**
 * Gets a `DocumentReference` instance that refers to a document within
 * `reference` at the specified relative path. If no path is specified, an
 * automatically-generated unique ID will be used for the returned
 * `DocumentReference`.
 *
 * @param reference A reference to a collection.
 * @param path A slash-separated path to a document. Has to be omitted to use
 * auto-genrated IDs.
 * @param pathSegments Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @return The `DocumentReference` instance.
 */
export function doc<T>(
  reference: CollectionReference<T>,
  path?: string,
  ...pathSegments: string[]
): DocumentReference<T>;
/**
 * Gets a `DocumentReference` instance that refers to a document within
 * `reference` at the specified relative path.
 *
 * @param reference A reference to a Firestore document.
 * @param path A slash-separated path to a document.
 * @param pathSegments Additional path segments that will be applied relative
 * to the first argument.
 * @throws If the final path has an odd number of segments and does not point to
 * a document.
 * @return The `DocumentReference` instance.
 */
export function doc(
  reference: DocumentReference<unknown>,
  path: string,
  ...pathSegments: string[]
): DocumentReference<DocumentData>;
export function doc<T>(
  parent:
    | FirebaseFirestore
    | CollectionReference<T>
    | DocumentReference<unknown>,
  path?: string,
  ...pathSegments: string[]
): DocumentReference {
  // We allow omission of 'pathString' but explicitly prohibit passing in both
  // 'undefined' and 'null'.
  if (arguments.length === 1) {
    path = AutoId.newId();
  }
  validateNonEmptyArgument('doc', 'path', path);

  if (parent instanceof FirebaseFirestore) {
    const absolutePath = ResourcePath.fromString(path, ...pathSegments);
    validateDocumentPath(absolutePath);
    return new DocumentReference(
      parent,
      /* converter= */ null,
      new DocumentKey(absolutePath)
    );
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
      ResourcePath.fromString(path, ...pathSegments)
    );
    validateDocumentPath(absolutePath);
    return new DocumentReference(
      parent.firestore,
      parent instanceof CollectionReference ? parent._converter : null,
      new DocumentKey(absolutePath)
    );
  }
}

export class LiteUserDataWriter extends AbstractUserDataWriter {
  constructor(protected firestore: FirebaseFirestore) {
    super();
  }

  protected convertBytes(bytes: ByteString): Bytes {
    return new Bytes(bytes);
  }

  protected convertReference(name: string): DocumentReference {
    const key = this.convertDocumentKey(name, this.firestore._databaseId);
    return new DocumentReference(this.firestore, /* converter= */ null, key);
  }
}

/**
 * Reads the document referred to by the specified document reference.
 *
 * All documents are directly fetched from the server, even if the document was
 * previously read or modified. Recent modifications are only reflected in the
 * retrieved `DocumentSnapshot` if they have already been applied by the
 * backend. If the client is offline, the read fails. If you like to use
 * caching or see local modifications, please use the full Firestore SDK.
 *
 * @param reference The reference of the document to fetch.
 * @return A Promise resolved with a `DocumentSnapshot` containing the current
 * document contents.
 */
export function getDoc<T>(
  reference: DocumentReference<T>
): Promise<DocumentSnapshot<T>> {
  const datastore = getDatastore(reference.firestore);
  const userDataWriter = new LiteUserDataWriter(reference.firestore);

  return invokeBatchGetDocumentsRpc(datastore, [reference._key]).then(
    result => {
      hardAssert(result.length === 1, 'Expected a single document result');
      const maybeDocument = result[0];
      return new DocumentSnapshot<T>(
        reference.firestore,
        userDataWriter,
        reference._key,
        maybeDocument instanceof Document ? maybeDocument : null,
        reference._converter
      );
    }
  );
}

/**
 * Executes the query and returns the results as a {@link QuerySnapshot}.
 *
 * All queries are executed directly by the server, even if the the query was
 * previously executed. Recent modifications are only reflected in the retrieved
 * results if they have already been applied by the backend. If the client is
 * offline, the operation fails. To see previously cached result and local
 * modifications, use the full Firestore SDK.
 *
 * @param query The `Query` to execute.
 * @return A Promise that will be resolved with the results of the query.
 */
export function getDocs<T>(query: Query<T>): Promise<QuerySnapshot<T>> {
  validateHasExplicitOrderByForLimitToLast(query._query);

  const datastore = getDatastore(query.firestore);
  const userDataWriter = new LiteUserDataWriter(query.firestore);
  return invokeRunQueryRpc(datastore, query._query).then(result => {
    const docs = result.map(
      doc =>
        new QueryDocumentSnapshot<T>(
          query.firestore,
          userDataWriter,
          doc.key,
          doc,
          query._converter
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

/**
 * Writes to the document referred to by the specified `DocumentReference`. If
 * the document does not yet exist, it will be created.
 *
 * The result of this write will only be reflected in document reads that occur
 * after the returned Promise resolves. If the client is offline, the
 * write fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the document to write.
 * @param data A map of the fields and values for the document.
 * @return A Promise resolved once the data has been successfully written
 * to the backend.
 */
export function setDoc<T>(
  reference: DocumentReference<T>,
  data: T
): Promise<void>;
/**
 * Writes to the document referred to by the specified `DocumentReference`. If
 * the document does not yet exist, it will be created. If you provide `merge`
 * or `mergeFields`, the provided data can be merged into an existing document.
 *
 * The result of this write will only be reflected in document reads that occur
 * after the returned Promise resolves. If the client is offline, the
 * write fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the document to write.
 * @param data A map of the fields and values for the document.
 * @param options An object to configure the set behavior.
 * @return A Promise resolved once the data has been successfully written
 * to the backend.
 */
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

/**
 * Updates fields in the document referred to by the specified
 * `DocumentReference`. The update will fail if applied to a document that does
 * not exist.
 *
 * The result of this update will only be reflected in document reads that occur
 * after the returned Promise resolves. If the client is offline, the
 * update fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the document to update.
 * @param data An object containing the fields and values with which to
 * update the document. Fields can contain dots to reference nested fields
 * within the document.
 * @return A Promise resolved once the data has been successfully written
 * to the backend.
 */
export function updateDoc(
  reference: DocumentReference<unknown>,
  data: UpdateData
): Promise<void>;
/**
 * Updates fields in the document referred to by the specified
 * `DocumentReference` The update will fail if applied to a document that does
 * not exist.
 *
 * Nested fields can be updated by providing dot-separated field path
 * strings or by providing `FieldPath` objects.
 *
 * The result of this update will only be reflected in document reads that occur
 * after the returned Promise resolves. If the client is offline, the
 * update fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the document to update.
 * @param field The first field to update.
 * @param value The first value.
 * @param moreFieldsAndValues Additional key value pairs.
 * @return A Promise resolved once the data has been successfully written
 * to the backend.
 */
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

  // For Compat types, we have to "extract" the underlying types before
  // performing validation.
  if (fieldOrUpdateData instanceof Compat) {
    fieldOrUpdateData = fieldOrUpdateData._delegate;
  }

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

/**
 * Deletes the document referred to by the specified `DocumentReference`.
 *
 * The deletion will only be reflected in document reads that occur after the
 * returned Promise resolves. If the client is offline, the
 * delete fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the document to delete.
 * @return A Promise resolved once the document has been successfully
 * deleted from the backend.
 */
export function deleteDoc(reference: DocumentReference): Promise<void> {
  const datastore = getDatastore(reference.firestore);
  return invokeCommitRpc(datastore, [
    new DeleteMutation(reference._key, Precondition.none())
  ]);
}

/**
 * Add a new document to specified `CollectionReference` with the given data,
 * assigning it a document ID automatically.
 *
 * The result of this write will only be reflected in document reads that occur
 * after the returned Promise resolves. If the client is offline, the
 * write fails. If you would like to see local modifications or buffer writes
 * until the client is online, use the full Firestore SDK.
 *
 * @param reference A reference to the collection to add this document to.
 * @param data An Object containing the data for the new document.
 * @return A Promise resolved with a `DocumentReference` pointing to the
 * newly created document after it has been written to the backend.
 */
export function addDoc<T>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>> {
  const docRef = doc(reference);

  const convertedValue = applyFirestoreDataConverter(
    reference._converter,
    data
  );

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

/**
 * Returns true if the provided references are equal.
 *
 * @param left A reference to compare.
 * @param right A reference to compare.
 * @return true if the references point to the same location in the same
 * Firestore database.
 */
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
      left._converter === right._converter
    );
  }
  return false;
}

/**
 * Returns true if the provided queries point to the same collection and apply
 * the same constraints.
 *
 * @param left A `Query` to compare.
 * @param right A Query` to compare.
 * @return true if the references point to the same location in the same
 * Firestore database.
 */
export function queryEqual<T>(left: Query<T>, right: Query<T>): boolean {
  if (left instanceof Query && right instanceof Query) {
    return (
      left.firestore === right.firestore &&
      queryEquals(left._query, right._query) &&
      left._converter === right._converter
    );
  }
  return false;
}

export function newUserDataReader(
  firestore: FirebaseFirestore
): UserDataReader {
  const settings = firestore._freezeSettings();
  const serializer = newSerializer(firestore._databaseId);
  return new UserDataReader(
    firestore._databaseId,
    !!settings.ignoreUndefinedProperties,
    serializer
  );
}
