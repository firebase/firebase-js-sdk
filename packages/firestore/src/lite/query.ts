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

import { getModularInstance } from '@firebase/util';

import { DatabaseId } from '../core/database_info';
import {
  findFilterOperator,
  getFirstOrderByField,
  getInequalityFilterField,
  hasLimitToLast,
  isCollectionGroupQuery,
  LimitType,
  Query as InternalQuery,
  queryOrderBy,
  queryWithAddedFilter,
  queryWithAddedOrderBy,
  queryWithEndAt,
  queryWithLimit,
  queryWithStartAt
} from '../core/query';
import {
  Bound,
  Direction,
  FieldFilter,
  Filter,
  Operator,
  OrderBy
} from '../core/target';
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { FieldPath as InternalFieldPath, ResourcePath } from '../model/path';
import { isServerTimestamp } from '../model/server_timestamps';
import { refValue } from '../model/values';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { debugAssert } from '../util/assert';
import { Code, FirestoreError } from '../util/error';
import {
  validatePositiveNumber,
  valueDescription
} from '../util/input_validation';

import { FieldPath } from './field_path';
import { DocumentReference, Query } from './reference';
import { DocumentSnapshot, fieldPathFromArgument } from './snapshot';
import {
  newUserDataReader,
  parseQueryValue,
  UserDataReader
} from './user_data_reader';

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
 * Firestore query. `QueryConstraint`s are created by invoking {@link where},
 * {@link orderBy}, {@link (startAt:1)}, {@link (startAfter:1)}, {@link
 * endBefore:1}, {@link (endAt:1)}, {@link limit} or {@link limitToLast} and
 * can then be passed to {@link query} to create a new query instance that
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
 * Creates a new immutable instance of `Query` that is extended to also include
 * additional query constraints.
 *
 * @param query - The Query instance to use as a base for the new constraints.
 * @param queryConstraints - The list of `QueryConstraint`s to apply.
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
      query.converter,
      queryWithAddedFilter(query._query, filter)
    );
  }
}

/**
 * Filter conditions in a {@link where} clause are specified using the
 * strings '&lt;', '&lt;=', '==', '!=', '&gt;=', '&gt;', 'array-contains', 'in',
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
 * @param fieldPath - The path to compare
 * @param opStr - The operation string (e.g "&lt;", "&lt;=", "==", "&lt;",
 *   "&lt;=", "!=").
 * @param value - The value for comparison
 * @returns The created `Query`.
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
      query.converter,
      queryWithAddedOrderBy(query._query, orderBy)
    );
  }
}

/**
 * The direction of a {@link orderBy} clause is specified as 'desc' or 'asc'
 * (descending or ascending).
 */
export type OrderByDirection = 'desc' | 'asc';

/**
 * Creates a `QueryConstraint` that sorts the query result by the
 * specified field, optionally in descending order instead of ascending.
 *
 * @param fieldPath - The field to sort by.
 * @param directionStr - Optional direction to sort by ('asc' or 'desc'). If
 * not specified, order will be ascending.
 * @returns The created `Query`.
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
      query.converter,
      queryWithLimit(query._query, this._limit, this._limitType)
    );
  }
}

/**
 * Creates a `QueryConstraint` that only returns the first matching documents.
 *
 * @param limit - The maximum number of items to return.
 * @returns The created `Query`.
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
 * @param limit - The maximum number of items to return.
 * @returns The created `Query`.
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
      query.converter,
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
 * @param snapshot - The snapshot of the document to start at.
 * @returns A `QueryConstraint` to pass to `query()`.
 */
export function startAt(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to start at the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues - The field values to start this query at, in order
 * of the query's order by.
 * @returns A `QueryConstraint` to pass to `query()`.
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
 * @param snapshot - The snapshot of the document to start after.
 * @returns A `QueryConstraint` to pass to `query()`
 */
export function startAfter(
  snapshot: DocumentSnapshot<unknown>
): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to start after the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues - The field values to start this query after, in order
 * of the query's order by.
 * @returns A `QueryConstraint` to pass to `query()`
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
      query.converter,
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
 * @param snapshot - The snapshot of the document to end before.
 * @returns A `QueryConstraint` to pass to `query()`
 */
export function endBefore(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to end before the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues - The field values to end this query before, in order
 * of the query's order by.
 * @returns A `QueryConstraint` to pass to `query()`
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
 * @param snapshot - The snapshot of the document to end at.
 * @returns A `QueryConstraint` to pass to `query()`
 */
export function endAt(snapshot: DocumentSnapshot<unknown>): QueryConstraint;
/**
 * Creates a `QueryConstraint` that modifies the result set to end at the
 * provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues - The field values to end this query at, in order
 * of the query's order by.
 * @returns A `QueryConstraint` to pass to `query()`
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
  docOrFields[0] = getModularInstance(docOrFields[0]);

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
      const value = doc.data.field(orderBy.field);
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
  documentIdValue = getModularInstance(documentIdValue);

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
  } else if (documentIdValue instanceof DocumentReference) {
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
          ' (<, <=, !=, not-in, >, or >=) must be on the same field. But you have' +
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
        `(<, <=, !=, not-in, >, or >=) on field '${inequality.toString()}' ` +
        `and so you must also use '${inequality.toString()}' ` +
        `as your first argument to orderBy(), but your first orderBy() ` +
        `is on field '${orderBy.toString()}' instead.`
    );
  }
}
