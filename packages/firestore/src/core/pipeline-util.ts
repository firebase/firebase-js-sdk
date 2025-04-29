/**
 * @license
 * Copyright 2024 Google LLC
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

import { Firestore } from '../lite-api/database';
import {
  Constant,
  BooleanExpr,
  and,
  or,
  Ordering,
  lt,
  gt,
  field
} from '../lite-api/expressions';
import { Pipeline } from '../lite-api/pipeline';
import { doc } from '../lite-api/reference';
import { isNanValue, isNullValue } from '../model/values';
import { fail } from '../util/assert';

import { Bound } from './bound';
import {
  CompositeFilter as CompositeFilterInternal,
  CompositeOperator,
  FieldFilter as FieldFilterInternal,
  Filter as FilterInternal,
  Operator
} from './filter';
import { Direction } from './order_by';
import {
  isCollectionGroupQuery,
  isDocumentQuery,
  LimitType,
  Query,
  queryNormalizedOrderBy
} from './query';

/* eslint @typescript-eslint/no-explicit-any: 0 */

export function toPipelineBooleanExpr(f: FilterInternal): BooleanExpr {
  if (f instanceof FieldFilterInternal) {
    const fieldValue = field(f.field.toString());
    if (isNanValue(f.value)) {
      if (f.op === Operator.EQUAL) {
        return and(fieldValue.exists(), fieldValue.isNan());
      } else {
        return and(fieldValue.exists(), fieldValue.isNotNan());
      }
    } else if (isNullValue(f.value)) {
      if (f.op === Operator.EQUAL) {
        return and(fieldValue.exists(), fieldValue.isNull());
      } else {
        return and(fieldValue.exists(), fieldValue.isNotNull());
      }
    } else {
      // Comparison filters
      const value = f.value;
      switch (f.op) {
        case Operator.LESS_THAN:
          return and(
            fieldValue.exists(),
            fieldValue.lt(Constant._fromProto(value))
          );
        case Operator.LESS_THAN_OR_EQUAL:
          return and(
            fieldValue.exists(),
            fieldValue.lte(Constant._fromProto(value))
          );
        case Operator.GREATER_THAN:
          return and(
            fieldValue.exists(),
            fieldValue.gt(Constant._fromProto(value))
          );
        case Operator.GREATER_THAN_OR_EQUAL:
          return and(
            fieldValue.exists(),
            fieldValue.gte(Constant._fromProto(value))
          );
        case Operator.EQUAL:
          return and(
            fieldValue.exists(),
            fieldValue.eq(Constant._fromProto(value))
          );
        case Operator.NOT_EQUAL:
          return and(
            fieldValue.exists(),
            fieldValue.neq(Constant._fromProto(value))
          );
        case Operator.ARRAY_CONTAINS:
          return and(
            fieldValue.exists(),
            fieldValue.arrayContains(Constant._fromProto(value))
          );
        case Operator.IN: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant._fromProto(val)
          );
          if (!values) {
            return and(fieldValue.exists(), fieldValue.eqAny([]));
          } else if (values.length === 1) {
            return and(fieldValue.exists(), fieldValue.eq(values[0]));
          } else {
            return and(fieldValue.exists(), fieldValue.eqAny(values));
          }
        }
        case Operator.ARRAY_CONTAINS_ANY: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant._fromProto(val)
          );
          return and(fieldValue.exists(), fieldValue.arrayContainsAny(values!));
        }
        case Operator.NOT_IN: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant._fromProto(val)
          );
          if (!values) {
            return and(fieldValue.exists(), fieldValue.notEqAny([]));
          } else if (values.length === 1) {
            return and(fieldValue.exists(), fieldValue.neq(values[0]));
          } else {
            return and(fieldValue.exists(), fieldValue.notEqAny(values));
          }
        }
        default:
          fail('Unexpected operator');
      }
    }
  } else if (f instanceof CompositeFilterInternal) {
    switch (f.op) {
      case CompositeOperator.AND: {
        const conditions = f.getFilters().map(f => toPipelineBooleanExpr(f));
        return and(conditions[0], conditions[1], ...conditions.slice(2));
      }
      case CompositeOperator.OR: {
        const conditions = f.getFilters().map(f => toPipelineBooleanExpr(f));
        return or(conditions[0], conditions[1], ...conditions.slice(2));
      }
      default:
        fail('Unexpected operator');
    }
  }

  throw new Error(`Failed to convert filter to pipeline conditions: ${f}`);
}

function reverseOrderings(orderings: Ordering[]): Ordering[] {
  return orderings.map(
    o =>
      new Ordering(
        o.expr,
        o.direction === 'ascending' ? 'descending' : 'ascending'
      )
  );
}

export function toPipeline(query: Query, db: Firestore): Pipeline {
  let pipeline: Pipeline;
  if (isCollectionGroupQuery(query)) {
    pipeline = db.pipeline().collectionGroup(query.collectionGroup!);
  } else if (isDocumentQuery(query)) {
    pipeline = db.pipeline().documents([doc(db, query.path.canonicalString())]);
  } else {
    pipeline = db.pipeline().collection(query.path.canonicalString());
  }

  // filters
  for (const filter of query.filters) {
    pipeline = pipeline.where(toPipelineBooleanExpr(filter));
  }

  // orders
  const orders = queryNormalizedOrderBy(query);
  const existsConditions = orders.map(order =>
    field(order.field.canonicalString()).exists()
  );
  if (existsConditions.length > 1) {
    pipeline = pipeline.where(
      and(
        existsConditions[0],
        existsConditions[1],
        ...existsConditions.slice(2)
      )
    );
  } else {
    pipeline = pipeline.where(existsConditions[0]);
  }

  const orderings = orders.map(order =>
    order.dir === Direction.ASCENDING
      ? field(order.field.canonicalString()).ascending()
      : field(order.field.canonicalString()).descending()
  );

  if (orderings.length > 0) {
    if (query.limitType === LimitType.Last) {
      const actualOrderings = reverseOrderings(orderings);
      pipeline = pipeline.sort(actualOrderings[0], ...actualOrderings.slice(1));
      // cursors
      if (query.startAt !== null) {
        pipeline = pipeline.where(
          whereConditionsFromCursor(query.startAt, orderings, 'after')
        );
      }

      if (query.endAt !== null) {
        pipeline = pipeline.where(
          whereConditionsFromCursor(query.endAt, orderings, 'before')
        );
      }

      pipeline = pipeline.limit(query.limit!, true);
      pipeline = pipeline.sort(orderings[0], ...orderings.slice(1));
    } else {
      pipeline = pipeline.sort(orderings[0], ...orderings.slice(1));
      if (query.startAt !== null) {
        pipeline = pipeline.where(
          whereConditionsFromCursor(query.startAt, orderings, 'after')
        );
      }
      if (query.endAt !== null) {
        pipeline = pipeline.where(
          whereConditionsFromCursor(query.endAt, orderings, 'before')
        );
      }

      if (query.limit !== null) {
        pipeline = pipeline.limit(query.limit);
      }
    }
  }

  return pipeline;
}

function whereConditionsFromCursor(
  bound: Bound,
  orderings: Ordering[],
  position: 'before' | 'after'
): BooleanExpr {
  // The filterFunc is either greater than or less than
  const filterFunc = position === 'before' ? lt : gt;
  const cursors = bound.position.map(value => Constant._fromProto(value));
  const size = cursors.length;

  let field = orderings[size - 1].expr;
  let value = cursors[size - 1];

  // Add condition for last bound
  let condition: BooleanExpr = filterFunc(field, value);
  if (bound.inclusive) {
    // When the cursor bound is inclusive, then the last bound
    // can be equal to the value, otherwise it's not equal
    condition = or(condition, field.eq(value));
  }

  // Iterate backwards over the remaining bounds, adding
  // a condition for each one
  for (let i = size - 2; i >= 0; i--) {
    field = orderings[i].expr;
    value = cursors[i];

    // For each field in the orderings, the condition is either
    // a) lt|gt the cursor value,
    // b) or equal the cursor value and lt|gt the cursor values for other fields
    condition = or(filterFunc(field, value), and(field.eq(value), condition));
  }

  return condition;
}
