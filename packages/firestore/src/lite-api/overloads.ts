import { CompositeOperator } from '../core/filter';

import { And, FilterExpr, Or } from './expressions';
import {
  QueryCompositeFilterConstraint,
  QueryConstraint,
  QueryFilterConstraint,
  validateQueryFilterConstraint
} from './query';

/**
 * @beta
 *
 * Creates an expression that performs a logical 'OR' operation on multiple filter conditions.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18 OR the 'city' field is "London" OR
 * // the 'status' field is "active"
 * const condition = or(gt("age", 18), eq("city", "London"), eq("status", "active"));
 * ```
 *
 * @param left The first filter condition.
 * @param right Additional filter conditions to 'OR' together.
 * @return A new {@code Expr} representing the logical 'OR' operation.
 */
export function or(left: FilterExpr, ...right: FilterExpr[]): Or;

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
): QueryCompositeFilterConstraint;

export function or(
  leftFilterExprOrQueryConstraint?: FilterExpr | QueryFilterConstraint,
  ...right: FilterExpr[] | QueryFilterConstraint[]
): Or | QueryCompositeFilterConstraint {
  if (leftFilterExprOrQueryConstraint === undefined) {
    return or._orFilters();
  } else if (
    leftFilterExprOrQueryConstraint instanceof QueryConstraint ||
    leftFilterExprOrQueryConstraint instanceof QueryCompositeFilterConstraint ||
    leftFilterExprOrQueryConstraint === undefined
  ) {
    return or._orFilters(
      leftFilterExprOrQueryConstraint,
      ...(right as QueryFilterConstraint[])
    );
  } else {
    // @ts-ignore
    return or._orFunction(leftFilterExprOrQueryConstraint, ...right);
  }
}

or._orFilters = function (
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
};

or._orFunction = function (left: FilterExpr, ...right: FilterExpr[]): Or {
  throw new Error(
    'Pipelines not initialized. Your application must call `useFirestorePipelines()` before using Firestore Pipeline features.'
  );
};

/**
 * @beta
 *
 * Creates an expression that performs a logical 'AND' operation on multiple filter conditions.
 *
 * ```typescript
 * // Check if the 'age' field is greater than 18 AND the 'city' field is "London" AND
 * // the 'status' field is "active"
 * const condition = and(gt("age", 18), eq("city", "London"), eq("status", "active"));
 * ```
 *
 * @param left The first filter condition.
 * @param right Additional filter conditions to 'AND' together.
 * @return A new {@code Expr} representing the logical 'AND' operation.
 */
export function and(left: FilterExpr, ...right: FilterExpr[]): And;

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
): QueryCompositeFilterConstraint;

export function and(
  leftFilterExprOrQueryConstraint?: FilterExpr | QueryFilterConstraint,
  ...right: FilterExpr[] | QueryFilterConstraint[]
): And | QueryCompositeFilterConstraint {
  if (leftFilterExprOrQueryConstraint === undefined) {
    return and._andFilters();
  }
  if (
    leftFilterExprOrQueryConstraint instanceof QueryConstraint ||
    leftFilterExprOrQueryConstraint === undefined
  ) {
    return and._andFilters(
      leftFilterExprOrQueryConstraint,
      ...(right as QueryFilterConstraint[])
    );
  } else {
    return and._andFunction(
      leftFilterExprOrQueryConstraint as FilterExpr,
      ...(right as FilterExpr[])
    );
  }
}

and._andFilters = function (
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
};

and._andFunction = function (left: FilterExpr, ...right: FilterExpr[]): And {
  throw new Error(
    'Pipelines not initialized. Your application must call `useFirestorePipelines()` before using Firestore Pipeline features.'
  );
};
