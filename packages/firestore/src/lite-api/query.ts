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

import { Bound } from '../core/bound';
import { DatabaseId } from '../core/database_info';
import {
  CompositeFilter,
  CompositeOperator,
  FieldFilter,
  Filter,
  Operator
} from '../core/filter';
import { Direction, OrderBy } from '../core/order_by';
import {
  isCollectionGroupQuery,
  LimitType,
  Query as InternalQuery,
  queryNormalizedOrderBy,
  queryWithAddedFilter,
  queryWithAddedOrderBy,
  queryWithEndAt,
  queryWithLimit,
  queryWithStartAt
} from '../core/query';
import { Document } from '../model/document';
import { DocumentKey } from '../model/document_key';
import { FieldPath as InternalFieldPath, ResourcePath } from '../model/path';
import { isServerTimestamp } from '../model/server_timestamps';
import { refValue } from '../model/values';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { Code, FirestoreError } from '../util/error';
import {
  validatePositiveNumber,
  valueDescription
} from '../util/input_validation';

import { FieldPath } from './field_path';
import { DocumentData, DocumentReference, Query } from './reference';
import { DocumentSnapshot, fieldPathFromArgument } from './snapshot';
import {
  newUserDataReader,
  parseQueryValue,
  UserDataReader
} from './user_data_reader';

export function validateHasExplicitOrderByForLimitToLast(
  query: InternalQuery
): void {
  if (
    query.limitType === LimitType.Last &&
    query.explicitOrderBy.length === 0
  ) {
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
 * An `AppliableConstraint` is an abstraction of a constraint that can be applied
 * to a Firestore query.
 */
export abstract class AppliableConstraint {
  /**
   * Takes the provided {@link Query} and returns a copy of the {@link Query} with this
   * {@link AppliableConstraint} applied.
   */
  abstract _apply<AppModelType, DbModelType extends DocumentData>(
    query: Query<AppModelType, DbModelType>
  ): Query<AppModelType, DbModelType>;
}

/**
 * A `QueryConstraint` is used to narrow the set of documents returned by a
 * Firestore query. `QueryConstraint`s are created by invoking {@link where},
 * {@link orderBy}, {@link (startAt:1)}, {@link (startAfter:1)}, {@link
 * (endBefore:1)}, {@link (endAt:1)}, {@link limit}, {@link limitToLast} and
 * can then be passed to {@link (query:1)} to create a new query instance that
 * also contains this `QueryConstraint`.
 */
export abstract class QueryConstraint extends AppliableConstraint {
  /** The type of this query constraint */
  abstract readonly type: QueryConstraintType;

  /**
   * Takes the provided {@link Query} and returns a copy of the {@link Query} with this
   * {@link AppliableConstraint} applied.
   */
  abstract _apply<AppModelType, DbModelType extends DocumentData>(
    query: Query<AppModelType, DbModelType>
  ): Query<AppModelType, DbModelType>;
}

/**
 * Creates a new immutable instance of {@link Query} that is extended to also
 * include additional query constraints.
 *
 * @param query - The {@link Query} instance to use as a base for the new
 * constraints.
 * @param compositeFilter - The {@link QueryCompositeFilterConstraint} to
 * apply. Create {@link QueryCompositeFilterConstraint} using {@link and} or
 * {@link or}.
 * @param queryConstraints - Additional {@link QueryNonFilterConstraint}s to
 * apply (e.g. {@link orderBy}, {@link limit}).
 * @throws if any of the provided query constraints cannot be combined with the
 * existing or new constraints.
 */
export function query<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  compositeFilter: QueryCompositeFilterConstraint,
  ...queryConstraints: QueryNonFilterConstraint[]
): Query<AppModelType, DbModelType>;

/**
 * Creates a new immutable instance of {@link Query} that is extended to also
 * include additional query constraints.
 *
 * @param query - The {@link Query} instance to use as a base for the new
 * constraints.
 * @param queryConstraints - The list of {@link QueryConstraint}s to apply.
 * @throws if any of the provided query constraints cannot be combined with the
 * existing or new constraints.
 */
export function query<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  ...queryConstraints: QueryConstraint[]
): Query<AppModelType, DbModelType>;

export function query<AppModelType, DbModelType extends DocumentData>(
  query: Query<AppModelType, DbModelType>,
  queryConstraint: QueryCompositeFilterConstraint | QueryConstraint | undefined,
  ...additionalQueryConstraints: Array<
    QueryConstraint | QueryNonFilterConstraint
  >
): Query<AppModelType, DbModelType> {
  let queryConstraints: AppliableConstraint[] = [];

  if (queryConstraint instanceof AppliableConstraint) {
    queryConstraints.push(queryConstraint);
  }

  queryConstraints = queryConstraints.concat(additionalQueryConstraints);

  validateQueryConstraintArray(queryConstraints);

  for (const constraint of queryConstraints) {
    query = constraint._apply(query);
  }
  return query;
}

/**
 * A `QueryFieldFilterConstraint` is used to narrow the set of documents returned by
 * a Firestore query by filtering on one or more document fields.
 * `QueryFieldFilterConstraint`s are created by invoking {@link where} and can then
 * be passed to {@link (query:1)} to create a new query instance that also contains
 * this `QueryFieldFilterConstraint`.
 */
export class QueryFieldFilterConstraint extends QueryConstraint {
  /** The type of this query constraint */
  readonly type = 'where';

  /**
   * @internal
   */
  protected constructor(
    private readonly _field: InternalFieldPath,
    private _op: Operator,
    private _value: unknown
  ) {
    super();
  }

  static _create(
    _field: InternalFieldPath,
    _op: Operator,
    _value: unknown
  ): QueryFieldFilterConstraint {
    return new QueryFieldFilterConstraint(_field, _op, _value);
  }

  _apply<AppModelType, DbModelType extends DocumentData>(
    query: Query<AppModelType, DbModelType>
  ): Query<AppModelType, DbModelType> {
    const filter = this._parse(query);
    validateNewFieldFilter(query._query, filter);
    return new Query(
      query.firestore,
      query.converter,
      queryWithAddedFilter(query._query, filter)
    );
  }

  _parse<AppModelType, DbModelType extends DocumentData>(
    query: Query<AppModelType, DbModelType>
  ): FieldFilter {
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
    return filter;
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
 * Creates a {@link QueryFieldFilterConstraint} that enforces that documents
 * must contain the specified field and that the value should satisfy the
 * relation constraint provided.
 *
 * @param fieldPath - The path to compare
 * @param opStr - The operation string (e.g "&lt;", "&lt;=", "==", "&lt;",
 *   "&lt;=", "!=").
 * @param value - The value for comparison
 * @returns The created {@link QueryFieldFilterConstraint}.
 */
export function where(
  fieldPath: string | FieldPath,
  opStr: WhereFilterOp,
  value: unknown
): QueryFieldFilterConstraint {
  const op = opStr as Operator;
  const field = fieldPathFromArgument('where', fieldPath);
  return QueryFieldFilterConstraint._create(field, op, value);
}

/**
 * A `QueryCompositeFilterConstraint` is used to narrow the set of documents
 * returned by a Firestore query by performing the logical OR or AND of multiple
 * {@link QueryFieldFilterConstraint}s or {@link QueryCompositeFilterConstraint}s.
 * `QueryCompositeFilterConstraint`s are created by invoking {@link or} or
 * {@link and} and can then be passed to {@link (query:1)} to create a new query
 * instance that also contains the `QueryCompositeFilterConstraint`.
 */
export class QueryCompositeFilterConstraint extends AppliableConstraint {
  /**
   * @internal
   */
  protected constructor(
    /** The type of this query constraint */
    readonly type: 'or' | 'and',
    private readonly _queryConstraints: QueryFilterConstraint[]
  ) {
    super();
  }

  static _create(
    type: 'or' | 'and',
    _queryConstraints: QueryFilterConstraint[]
  ): QueryCompositeFilterConstraint {
    return new QueryCompositeFilterConstraint(type, _queryConstraints);
  }

  _parse<AppModelType, DbModelType extends DocumentData>(
    query: Query<AppModelType, DbModelType>
  ): Filter {
    const parsedFilters = this._queryConstraints
      .map(queryConstraint => {
        return queryConstraint._parse(query);
      })
      .filter(parsedFilter => parsedFilter.getFilters().length > 0);

    if (parsedFilters.length === 1) {
      return parsedFilters[0];
    }

    return CompositeFilter.create(parsedFilters, this._getOperator());
  }

  _apply<AppModelType, DbModelType extends DocumentData>(
    query: Query<AppModelType, DbModelType>
  ): Query<AppModelType, DbModelType> {
    const parsedFilter = this._parse(query);
    if (parsedFilter.getFilters().length === 0) {
      // Return the existing query if not adding any more filters (e.g. an empty
      // composite filter).
      return query;
    }
    validateNewFilter(query._query, parsedFilter);

    return new Query(
      query.firestore,
      query.converter,
      queryWithAddedFilter(query._query, parsedFilter)
    );
  }

  _getQueryConstraints(): readonly AppliableConstraint[] {
    return this._queryConstraints;
  }

  _getOperator(): CompositeOperator {
    return this.type === 'and' ? CompositeOperator.AND : CompositeOperator.OR;
  }
}

/**
 * `QueryNonFilterConstraint` is a helper union type that represents
 * QueryConstraints which are used to narrow or order the set of documents,
 * but that do not explicitly filter on a document field.
 * `QueryNonFilterConstraint`s are created by invoking {@link orderBy},
 * {@link (startAt:1)}, {@link (startAfter:1)}, {@link (endBefore:1)}, {@link (endAt:1)},
 * {@link limit} or {@link limitToLast} and can then be passed to {@link (query:1)}
 * to create a new query instance that also contains the `QueryConstraint`.
 */
export type QueryNonFilterConstraint =
  | QueryOrderByConstraint
  | QueryLimitConstraint
  | QueryStartAtConstraint
  | QueryEndAtConstraint;

/**
 * `QueryFilterConstraint` is a helper union type that represents
 * {@link QueryFieldFilterConstraint} and {@link QueryCompositeFilterConstraint}.
 */
export type QueryFilterConstraint =
  | QueryFieldFilterConstraint
  | QueryCompositeFilterConstraint;

/**
 * Creates a new {@link QueryCompositeFilterConstraint} that is a disjunction of
 * the given filter constraints. A disjunction filter includes a document if it
 * satisfies any of the given filters.
 *
 * @param queryConstraints - Optional. The list of
 * {@link QueryFilterConstraint}s to perform a disjunction for. These must be
 * created with calls to {@link where}, {@link or}, or {@link and}.
 * @returns The newly created {@link QueryCompositeFilterConstraint}.
 */
export function or(
  ...queryConstraints: QueryFilterConstraint[]
): QueryCompositeFilterConstraint {
  // Only support QueryFilterConstraints
  queryConstraints.forEach(queryConstraint =>
    validateQueryFilterConstraint('or', queryConstraint)
  );

  return QueryCompositeFilterConstraint._create(
    CompositeOperator.OR,
    queryConstraints as QueryFilterConstraint[]
  );
}

/**
 * Creates a new {@link QueryCompositeFilterConstraint} that is a conjunction of
 * the given filter constraints. A conjunction filter includes a document if it
 * satisfies all of the given filters.
 *
 * @param queryConstraints - Optional. The list of
 * {@link QueryFilterConstraint}s to perform a conjunction for. These must be
 * created with calls to {@link where}, {@link or}, or {@link and}.
 * @returns The newly created {@link QueryCompositeFilterConstraint}.
 */
export function and(
  ...queryConstraints: QueryFilterConstraint[]
): QueryCompositeFilterConstraint {
  // Only support QueryFilterConstraints
  queryConstraints.forEach(queryConstraint =>
    validateQueryFilterConstraint('and', queryConstraint)
  );

  return QueryCompositeFilterConstraint._create(
    CompositeOperator.AND,
    queryConstraints as QueryFilterConstraint[]
  );
}

/**
 * A `QueryOrderByConstraint` is used to sort the set of documents returned by a
 * Firestore query. `QueryOrderByConstraint`s are created by invoking
 * {@link orderBy} and can then be passed to {@link (query:1)} to create a new query
 * instance that also contains this `QueryOrderByConstraint`.
 *
 * Note: Documents that do not contain the orderBy field will not be present in
 * the query result.
 */
export class QueryOrderByConstraint extends QueryConstraint {
  /** The type of this query constraint */
  readonly type = 'orderBy';

  /**
   * @internal
   */
  protected constructor(
    private readonly _field: InternalFieldPath,
    private _direction: Direction
  ) {
    super();
  }

  static _create(
    _field: InternalFieldPath,
    _direction: Direction
  ): QueryOrderByConstraint {
    return new QueryOrderByConstraint(_field, _direction);
  }

  _apply<AppModelType, DbModelType extends DocumentData>(
    query: Query<AppModelType, DbModelType>
  ): Query<AppModelType, DbModelType> {
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
 * Creates a {@link QueryOrderByConstraint} that sorts the query result by the
 * specified field, optionally in descending order instead of ascending.
 *
 * Note: Documents that do not contain the specified field will not be present
 * in the query result.
 *
 * @param fieldPath - The field to sort by.
 * @param directionStr - Optional direction to sort by ('asc' or 'desc'). If
 * not specified, order will be ascending.
 * @returns The created {@link QueryOrderByConstraint}.
 */
export function orderBy(
  fieldPath: string | FieldPath,
  directionStr: OrderByDirection = 'asc'
): QueryOrderByConstraint {
  const direction = directionStr as Direction;
  const path = fieldPathFromArgument('orderBy', fieldPath);
  return QueryOrderByConstraint._create(path, direction);
}

/**
 * A `QueryLimitConstraint` is used to limit the number of documents returned by
 * a Firestore query.
 * `QueryLimitConstraint`s are created by invoking {@link limit} or
 * {@link limitToLast} and can then be passed to {@link (query:1)} to create a new
 * query instance that also contains this `QueryLimitConstraint`.
 */
export class QueryLimitConstraint extends QueryConstraint {
  /**
   * @internal
   */
  protected constructor(
    /** The type of this query constraint */
    readonly type: 'limit' | 'limitToLast',
    private readonly _limit: number,
    private readonly _limitType: LimitType
  ) {
    super();
  }

  static _create(
    type: 'limit' | 'limitToLast',
    _limit: number,
    _limitType: LimitType
  ): QueryLimitConstraint {
    return new QueryLimitConstraint(type, _limit, _limitType);
  }

  _apply<AppModelType, DbModelType extends DocumentData>(
    query: Query<AppModelType, DbModelType>
  ): Query<AppModelType, DbModelType> {
    return new Query(
      query.firestore,
      query.converter,
      queryWithLimit(query._query, this._limit, this._limitType)
    );
  }
}

/**
 * Creates a {@link QueryLimitConstraint} that only returns the first matching
 * documents.
 *
 * @param limit - The maximum number of items to return.
 * @returns The created {@link QueryLimitConstraint}.
 */
export function limit(limit: number): QueryLimitConstraint {
  validatePositiveNumber('limit', limit);
  return QueryLimitConstraint._create('limit', limit, LimitType.First);
}

/**
 * Creates a {@link QueryLimitConstraint} that only returns the last matching
 * documents.
 *
 * You must specify at least one `orderBy` clause for `limitToLast` queries,
 * otherwise an exception will be thrown during execution.
 *
 * @param limit - The maximum number of items to return.
 * @returns The created {@link QueryLimitConstraint}.
 */
export function limitToLast(limit: number): QueryLimitConstraint {
  validatePositiveNumber('limitToLast', limit);
  return QueryLimitConstraint._create('limitToLast', limit, LimitType.Last);
}

/**
 * A `QueryStartAtConstraint` is used to exclude documents from the start of a
 * result set returned by a Firestore query.
 * `QueryStartAtConstraint`s are created by invoking {@link (startAt:1)} or
 * {@link (startAfter:1)} and can then be passed to {@link (query:1)} to create a
 * new query instance that also contains this `QueryStartAtConstraint`.
 */
export class QueryStartAtConstraint extends QueryConstraint {
  /**
   * @internal
   */
  protected constructor(
    /** The type of this query constraint */
    readonly type: 'startAt' | 'startAfter',
    private readonly _docOrFields: Array<unknown | DocumentSnapshot<unknown>>,
    private readonly _inclusive: boolean
  ) {
    super();
  }

  static _create(
    type: 'startAt' | 'startAfter',
    _docOrFields: Array<unknown | DocumentSnapshot<unknown>>,
    _inclusive: boolean
  ): QueryStartAtConstraint {
    return new QueryStartAtConstraint(type, _docOrFields, _inclusive);
  }

  _apply<AppModelType, DbModelType extends DocumentData>(
    query: Query<AppModelType, DbModelType>
  ): Query<AppModelType, DbModelType> {
    const bound = newQueryBoundFromDocOrFields(
      query,
      this.type,
      this._docOrFields,
      this._inclusive
    );
    return new Query<AppModelType, DbModelType>(
      query.firestore,
      query.converter,
      queryWithStartAt(query._query, bound)
    );
  }
}

/**
 * Creates a {@link QueryStartAtConstraint} that modifies the result set to
 * start at the provided document (inclusive). The starting position is relative
 * to the order of the query. The document must contain all of the fields
 * provided in the `orderBy` of this query.
 *
 * @param snapshot - The snapshot of the document to start at.
 * @returns A {@link QueryStartAtConstraint} to pass to `query()`.
 */
export function startAt<AppModelType, DbModelType extends DocumentData>(
  snapshot: DocumentSnapshot<AppModelType, DbModelType>
): QueryStartAtConstraint;
/**
 * Creates a {@link QueryStartAtConstraint} that modifies the result set to
 * start at the provided fields relative to the order of the query. The order of
 * the field values must match the order of the order by clauses of the query.
 *
 * @param fieldValues - The field values to start this query at, in order
 * of the query's order by.
 * @returns A {@link QueryStartAtConstraint} to pass to `query()`.
 */
export function startAt(...fieldValues: unknown[]): QueryStartAtConstraint;
export function startAt<AppModelType, DbModelType extends DocumentData>(
  ...docOrFields: Array<unknown | DocumentSnapshot<AppModelType, DbModelType>>
): QueryStartAtConstraint {
  return QueryStartAtConstraint._create(
    'startAt',
    docOrFields,
    /*inclusive=*/ true
  );
}

/**
 * Creates a {@link QueryStartAtConstraint} that modifies the result set to
 * start after the provided document (exclusive). The starting position is
 * relative to the order of the query. The document must contain all of the
 * fields provided in the orderBy of the query.
 *
 * @param snapshot - The snapshot of the document to start after.
 * @returns A {@link QueryStartAtConstraint} to pass to `query()`
 */
export function startAfter<AppModelType, DbModelType extends DocumentData>(
  snapshot: DocumentSnapshot<AppModelType, DbModelType>
): QueryStartAtConstraint;
/**
 * Creates a {@link QueryStartAtConstraint} that modifies the result set to
 * start after the provided fields relative to the order of the query. The order
 * of the field values must match the order of the order by clauses of the query.
 *
 * @param fieldValues - The field values to start this query after, in order
 * of the query's order by.
 * @returns A {@link QueryStartAtConstraint} to pass to `query()`
 */
export function startAfter(...fieldValues: unknown[]): QueryStartAtConstraint;
export function startAfter<AppModelType, DbModelType extends DocumentData>(
  ...docOrFields: Array<unknown | DocumentSnapshot<AppModelType, DbModelType>>
): QueryStartAtConstraint {
  return QueryStartAtConstraint._create(
    'startAfter',
    docOrFields,
    /*inclusive=*/ false
  );
}

/**
 * A `QueryEndAtConstraint` is used to exclude documents from the end of a
 * result set returned by a Firestore query.
 * `QueryEndAtConstraint`s are created by invoking {@link (endAt:1)} or
 * {@link (endBefore:1)} and can then be passed to {@link (query:1)} to create a new
 * query instance that also contains this `QueryEndAtConstraint`.
 */
export class QueryEndAtConstraint extends QueryConstraint {
  /**
   * @internal
   */
  protected constructor(
    /** The type of this query constraint */
    readonly type: 'endBefore' | 'endAt',
    private readonly _docOrFields: Array<unknown | DocumentSnapshot<unknown>>,
    private readonly _inclusive: boolean
  ) {
    super();
  }

  static _create(
    type: 'endBefore' | 'endAt',
    _docOrFields: Array<unknown | DocumentSnapshot<unknown>>,
    _inclusive: boolean
  ): QueryEndAtConstraint {
    return new QueryEndAtConstraint(type, _docOrFields, _inclusive);
  }

  _apply<AppModelType, DbModelType extends DocumentData>(
    query: Query<AppModelType, DbModelType>
  ): Query<AppModelType, DbModelType> {
    const bound = newQueryBoundFromDocOrFields(
      query,
      this.type,
      this._docOrFields,
      this._inclusive
    );
    return new Query(
      query.firestore,
      query.converter,
      queryWithEndAt(query._query, bound)
    );
  }
}

/**
 * Creates a {@link QueryEndAtConstraint} that modifies the result set to end
 * before the provided document (exclusive). The end position is relative to the
 * order of the query. The document must contain all of the fields provided in
 * the orderBy of the query.
 *
 * @param snapshot - The snapshot of the document to end before.
 * @returns A {@link QueryEndAtConstraint} to pass to `query()`
 */
export function endBefore<AppModelType, DbModelType extends DocumentData>(
  snapshot: DocumentSnapshot<AppModelType, DbModelType>
): QueryEndAtConstraint;
/**
 * Creates a {@link QueryEndAtConstraint} that modifies the result set to end
 * before the provided fields relative to the order of the query. The order of
 * the field values must match the order of the order by clauses of the query.
 *
 * @param fieldValues - The field values to end this query before, in order
 * of the query's order by.
 * @returns A {@link QueryEndAtConstraint} to pass to `query()`
 */
export function endBefore(...fieldValues: unknown[]): QueryEndAtConstraint;
export function endBefore<AppModelType, DbModelType extends DocumentData>(
  ...docOrFields: Array<unknown | DocumentSnapshot<AppModelType, DbModelType>>
): QueryEndAtConstraint {
  return QueryEndAtConstraint._create(
    'endBefore',
    docOrFields,
    /*inclusive=*/ false
  );
}

/**
 * Creates a {@link QueryEndAtConstraint} that modifies the result set to end at
 * the provided document (inclusive). The end position is relative to the order
 * of the query. The document must contain all of the fields provided in the
 * orderBy of the query.
 *
 * @param snapshot - The snapshot of the document to end at.
 * @returns A {@link QueryEndAtConstraint} to pass to `query()`
 */
export function endAt<AppModelType, DbModelType extends DocumentData>(
  snapshot: DocumentSnapshot<AppModelType, DbModelType>
): QueryEndAtConstraint;
/**
 * Creates a {@link QueryEndAtConstraint} that modifies the result set to end at
 * the provided fields relative to the order of the query. The order of the field
 * values must match the order of the order by clauses of the query.
 *
 * @param fieldValues - The field values to end this query at, in order
 * of the query's order by.
 * @returns A {@link QueryEndAtConstraint} to pass to `query()`
 */
export function endAt(...fieldValues: unknown[]): QueryEndAtConstraint;
export function endAt<AppModelType, DbModelType extends DocumentData>(
  ...docOrFields: Array<unknown | DocumentSnapshot<AppModelType, DbModelType>>
): QueryEndAtConstraint {
  return QueryEndAtConstraint._create(
    'endAt',
    docOrFields,
    /*inclusive=*/ true
  );
}

/** Helper function to create a bound from a document or fields */
function newQueryBoundFromDocOrFields<
  AppModelType,
  DbModelType extends DocumentData
>(
  query: Query<AppModelType, DbModelType>,
  methodName: string,
  docOrFields: Array<unknown | DocumentSnapshot<AppModelType, DbModelType>>,
  inclusive: boolean
): Bound {
  docOrFields[0] = getModularInstance(docOrFields[0]);

  if (docOrFields[0] instanceof DocumentSnapshot) {
    return newQueryBoundFromDocument(
      query._query,
      query.firestore._databaseId,
      methodName,
      docOrFields[0]._document,
      inclusive
    );
  } else {
    const reader = newUserDataReader(query.firestore);
    return newQueryBoundFromFields(
      query._query,
      query.firestore._databaseId,
      reader,
      methodName,
      docOrFields,
      inclusive
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
        `Invalid Query. You can't perform '${op}' queries on documentId().`
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
  return orderBy;
}

/**
 * Create a `Bound` from a query and a document.
 *
 * Note that the `Bound` will always include the key of the document
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
  inclusive: boolean
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
  for (const orderBy of queryNormalizedOrderBy(query)) {
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
  return new Bound(components, inclusive);
}

/**
 * Converts a list of field values to a `Bound` for the given query.
 */
export function newQueryBoundFromFields(
  query: InternalQuery,
  databaseId: DatabaseId,
  dataReader: UserDataReader,
  methodName: string,
  values: unknown[],
  inclusive: boolean
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
          `Invalid query. When querying a collection and ordering by documentId(), ` +
            `the value passed to ${methodName}() must be a plain document ID, but ` +
            `'${rawValue}' contains a slash.`
        );
      }
      const path = query.path.child(ResourcePath.fromString(rawValue));
      if (!DocumentKey.isDocumentKey(path)) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid query. When querying a collection group and ordering by ` +
            `documentId(), the value passed to ${methodName}() must result in a ` +
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

  return new Bound(components, inclusive);
}

/**
 * Parses the given `documentIdValue` into a `ReferenceValue`, throwing
 * appropriate errors if the value is anything other than a `DocumentReference`
 * or `string`, or if the string is malformed.
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
        'Invalid query. When querying with documentId(), you ' +
          'must provide a valid document ID, but it was an empty string.'
      );
    }
    if (!isCollectionGroupQuery(query) && documentIdValue.indexOf('/') !== -1) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid query. When querying a collection by ` +
          `documentId(), you must provide a plain document ID, but ` +
          `'${documentIdValue}' contains a '/' character.`
      );
    }
    const path = query.path.child(ResourcePath.fromString(documentIdValue));
    if (!DocumentKey.isDocumentKey(path)) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid query. When querying a collection group by ` +
          `documentId(), the value provided must result in a valid document path, ` +
          `but '${path}' is not because it has an odd number of segments (${path.length}).`
      );
    }
    return refValue(databaseId, new DocumentKey(path));
  } else if (documentIdValue instanceof DocumentReference) {
    return refValue(databaseId, documentIdValue._key);
  } else {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid query. When querying with documentId(), you must provide a valid ` +
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
}

/**
 * Given an operator, returns the set of operators that cannot be used with it.
 *
 * This is not a comprehensive check, and this function should be removed in the
 * long term. Validations should occur in the Firestore backend.
 *
 * Operators in a query must adhere to the following set of rules:
 * 1. Only one inequality per query.
 * 2. `NOT_IN` cannot be used with array, disjunctive, or `NOT_EQUAL` operators.
 */
function conflictingOps(op: Operator): Operator[] {
  switch (op) {
    case Operator.NOT_EQUAL:
      return [Operator.NOT_EQUAL, Operator.NOT_IN];
    case Operator.ARRAY_CONTAINS_ANY:
    case Operator.IN:
      return [Operator.NOT_IN];
    case Operator.NOT_IN:
      return [
        Operator.ARRAY_CONTAINS_ANY,
        Operator.IN,
        Operator.NOT_IN,
        Operator.NOT_EQUAL
      ];
    default:
      return [];
  }
}

function validateNewFieldFilter(
  query: InternalQuery,
  fieldFilter: FieldFilter
): void {
  const conflictingOp = findOpInsideFilters(
    query.filters,
    conflictingOps(fieldFilter.op)
  );
  if (conflictingOp !== null) {
    // Special case when it's a duplicate op to give a slightly clearer error message.
    if (conflictingOp === fieldFilter.op) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Invalid query. You cannot use more than one ' +
          `'${fieldFilter.op.toString()}' filter.`
      );
    } else {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Invalid query. You cannot use '${fieldFilter.op.toString()}' filters ` +
          `with '${conflictingOp.toString()}' filters.`
      );
    }
  }
}

function validateNewFilter(query: InternalQuery, filter: Filter): void {
  let testQuery = query;
  const subFilters = filter.getFlattenedFilters();
  for (const subFilter of subFilters) {
    validateNewFieldFilter(testQuery, subFilter);
    testQuery = queryWithAddedFilter(testQuery, subFilter);
  }
}

// Checks if any of the provided filter operators are included in the given list of filters and
// returns the first one that is, or null if none are.
function findOpInsideFilters(
  filters: Filter[],
  operators: Operator[]
): Operator | null {
  for (const filter of filters) {
    for (const fieldFilter of filter.getFlattenedFilters()) {
      if (operators.indexOf(fieldFilter.op) >= 0) {
        return fieldFilter.op;
      }
    }
  }
  return null;
}

export function validateQueryFilterConstraint(
  functionName: string,
  queryConstraint: AppliableConstraint
): void {
  if (
    !(queryConstraint instanceof QueryFieldFilterConstraint) &&
    !(queryConstraint instanceof QueryCompositeFilterConstraint)
  ) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Function ${functionName}() requires AppliableConstraints created with a call to 'where(...)', 'or(...)', or 'and(...)'.`
    );
  }
}

function validateQueryConstraintArray(
  queryConstraint: AppliableConstraint[]
): void {
  const compositeFilterCount = queryConstraint.filter(
    filter => filter instanceof QueryCompositeFilterConstraint
  ).length;
  const fieldFilterCount = queryConstraint.filter(
    filter => filter instanceof QueryFieldFilterConstraint
  ).length;

  if (
    compositeFilterCount > 1 ||
    (compositeFilterCount > 0 && fieldFilterCount > 0)
  ) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      'InvalidQuery. When using composite filters, you cannot use ' +
        'more than one filter at the top level. Consider nesting the multiple ' +
        'filters within an `and(...)` statement. For example: ' +
        'change `query(query, where(...), or(...))` to ' +
        '`query(query, and(where(...), or(...)))`.'
    );
  }
}
