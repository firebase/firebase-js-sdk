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

import { RealtimePipeline } from '../api/realtime_pipeline';
import { Firestore } from '../lite-api/database';
import {
  Constant,
  Expression,
  Field,
  BooleanExpression,
  and,
  or,
  Ordering,
  lessThan,
  greaterThan,
  lessThanOrEqual,
  greaterThanOrEqual,
  equal,
  field,
  FunctionExpression,
  ListOfExprs,
  AggregateFunction
} from '../lite-api/expressions';
import { Pipeline, Pipeline as ApiPipeline } from '../lite-api/pipeline';
import { doc, DocumentReference } from '../lite-api/reference';
import {
  AddFields,
  Aggregate,
  CollectionGroupSource,
  CollectionSource,
  DatabaseSource,
  Distinct,
  DocumentsSource,
  FindNearest,
  Limit,
  Offset,
  Select,
  Sort,
  Stage,
  Where
} from '../lite-api/stage';
import {
  CREATE_TIME_NAME,
  DOCUMENT_KEY_NAME,
  ResourcePath,
  UPDATE_TIME_NAME
} from '../model/path';
import {
  isNanValue,
  isNullValue,
  VECTOR_MAP_VECTORS_KEY
} from '../model/values';
import { debugAssert, fail } from '../util/assert';

import { Bound } from './bound';
import {
  CompositeFilter as CompositeFilterInternal,
  CompositeOperator,
  FieldFilter as FieldFilterInternal,
  Filter as FilterInternal,
  Operator
} from './filter';
import { Direction } from './order_by';
import { CorePipeline } from './pipeline';
import {
  canonifyQuery,
  isCollectionGroupQuery,
  isDocumentQuery,
  LimitType,
  Query,
  queryEquals,
  queryNormalizedOrderBy,
  stringifyQuery
} from './query';
import {
  canonifyTarget,
  Target,
  targetEquals,
  targetIsPipelineTarget
} from './target';
import { VectorValue } from '../api';

/* eslint @typescript-eslint/no-explicit-any: 0 */

export function toPipelineBooleanExpr(f: FilterInternal): BooleanExpression {
  if (f instanceof FieldFilterInternal) {
    const fieldValue = field(f.field.toString());
    // Comparison filters
    const value = f.value;
    switch (f.op) {
      case Operator.LESS_THAN:
        return and(
          fieldValue.exists(),
          fieldValue.lessThan(Constant._fromProto(value))
        );
      case Operator.LESS_THAN_OR_EQUAL:
        return and(
          fieldValue.exists(),
          fieldValue.lessThanOrEqual(Constant._fromProto(value))
        );
      case Operator.GREATER_THAN:
        return and(
          fieldValue.exists(),
          fieldValue.greaterThan(Constant._fromProto(value))
        );
      case Operator.GREATER_THAN_OR_EQUAL:
        return and(
          fieldValue.exists(),
          fieldValue.greaterThanOrEqual(Constant._fromProto(value))
        );
      case Operator.EQUAL:
        return and(
          fieldValue.exists(),
          fieldValue.equal(Constant._fromProto(value))
        );
      case Operator.NOT_EQUAL:
        return and(
          fieldValue.exists(),
          fieldValue.notEqual(Constant._fromProto(value))
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
          return and(fieldValue.exists(), fieldValue.equalAny([]));
        } else if (values.length === 1) {
          return and(fieldValue.exists(), fieldValue.equal(values[0]));
        } else {
          return and(fieldValue.exists(), fieldValue.equalAny(values));
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
          return and(fieldValue.exists(), fieldValue.notEqualAny([]));
        } else if (values.length === 1) {
          return and(fieldValue.exists(), fieldValue.notEqual(values[0]));
        } else {
          return and(fieldValue.exists(), fieldValue.notEqualAny(values));
        }
      }
      default:
        fail(0x9047, 'Unexpected operator');
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
        fail(0x89ea, 'Unexpected operator');
    }
  }

  throw new Error(`Failed to convert filter to pipeline conditions: ${f}`);
}

function reverseOrderings(orderings: Ordering[]): Ordering[] {
  return orderings.map(
    o =>
      new Ordering(
        o.expr,
        o.direction === 'ascending' ? 'descending' : 'ascending',
        undefined
      )
  );
}

export function toPipelineStages(query: Query, db: Firestore): Stage[] {
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

      pipeline = pipeline.limit(query.limit!);
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

  return pipeline.stages;
}

function whereConditionsFromCursor(
  bound: Bound,
  orderings: Ordering[],
  position: 'before' | 'after'
): BooleanExpression {
  // The filterFunc is either greater than or less than
  const filterFunc = position === 'before' ? lessThan : greaterThan;
  const cursors = bound.position.map(value => Constant._fromProto(value));
  const size = cursors.length;

  let field = orderings[size - 1].expr;
  let value = cursors[size - 1];

  // Add condition for last bound
  let condition: BooleanExpression = filterFunc(field, value);
  if (bound.inclusive) {
    // When the cursor bound is inclusive, then the last bound
    // can be equal to the value, otherwise it's not equal
    condition = or(condition, field.equal(value));
  }

  // Iterate backwards over the remaining bounds, adding
  // a condition for each one
  for (let i = size - 2; i >= 0; i--) {
    field = orderings[i].expr;
    value = cursors[i];

    // For each field in the orderings, the condition is either
    // a) lt|gt the cursor value,
    // b) or equal the cursor value and lt|gt the cursor values for other fields
    condition = or(
      filterFunc(field, value),
      and(field.equal(value), condition)
    );
  }

  return condition;
}

function canonifyConstantValue(value: unknown): string {
  if (value === null) {
    return 'null';
  } else if (typeof value === 'number') {
    return value.toString();
  } else if (typeof value === 'string') {
    return `"${value}"`;
  } else if (value instanceof DocumentReference) {
    return `ref(${value.path})`;
  } else if (value instanceof VectorValue) {
    return `vec(${JSON.stringify(value)})`;
  }
  {
    return JSON.stringify(value);
  }
}

export function canonifyExpr(expr: Expression): string {
  if (expr instanceof Field) {
    return `fld(${expr.fieldName})`;
  }
  if (expr instanceof Constant) {
    return `cst(${canonifyConstantValue(expr.value)})`;
  }
  if (expr instanceof FunctionExpression) {
    return `fn(${expr.name},[${expr.params.map(canonifyExpr).join(',')}])`;
  }
  if (expr instanceof ListOfExprs) {
    return `list([${expr.exprs.map(canonifyExpr).join(',')}])`;
  }
  throw new Error(`Unrecognized expr ${JSON.stringify(expr, null, 2)}`);
}

function canonifySortOrderings(orders: Ordering[]): string {
  return orders.map(o => `${canonifyExpr(o.expr)}${o.direction}`).join(',');
}

function canonifyStage(stage: Stage): string {
  if (stage instanceof AddFields) {
    return `${stage._name}(${canonifyExprMap(stage.fields)})`;
  }
  if (stage instanceof Aggregate) {
    let result = `${stage._name}(${canonifyExprMap(
      stage.accumulators as unknown as Map<string, Expression>
    )})`;
    if (stage.groups.size > 0) {
      result = result + `grouping(${canonifyExprMap(stage.groups)})`;
    }
    return result;
  }
  if (stage instanceof Distinct) {
    return `${stage._name}(${canonifyExprMap(stage.groups)})`;
  }
  if (stage instanceof CollectionSource) {
    return `${stage._name}(${stage.formattedCollectionPath})`;
  }
  if (stage instanceof CollectionGroupSource) {
    return `${stage._name}(${stage.collectionId})`;
  }
  if (stage instanceof DatabaseSource) {
    return `${stage._name}()`;
  }
  if (stage instanceof DocumentsSource) {
    return `${stage._name}(${stage.formattedPaths.sort()})`;
  }
  if (stage instanceof Where) {
    return `${stage._name}(${canonifyExpr(stage.condition)})`;
  }
  if (stage instanceof Limit) {
    return `${stage._name}(${stage.limit})`;
  }
  if (stage instanceof Sort) {
    return `${stage._name}(${canonifySortOrderings(stage.orderings)})`;
  }

  throw new Error(`Unrecognized stage ${stage._name}`);
}

function canonifyExprMap(map: Map<string, Expression>): string {
  const sortedEntries = Array.from(map.entries()).sort();
  return `${sortedEntries
    .map(([key, val]) => `${key}=${canonifyExpr(val)}`)
    .join(',')}`;
}

export function canonifyPipeline(p: CorePipeline): string;
export function canonifyPipeline(p: CorePipeline): string {
  return p.stages.map(s => canonifyStage(s)).join('|');
}

// TODO(pipeline): do a proper implementation for eq.
export function pipelineEq(left: CorePipeline, right: CorePipeline): boolean {
  return canonifyPipeline(left) === canonifyPipeline(right);
}

export type PipelineFlavor = 'exact' | 'augmented' | 'keyless';

export type PipelineSourceType =
  | 'collection'
  | 'collection_group'
  | 'database'
  | 'documents';

export function asCollectionPipelineAtPath(
  pipeline: CorePipeline,
  path: ResourcePath
): CorePipeline {
  const newStages = pipeline.stages.map(s => {
    if (s instanceof CollectionGroupSource) {
      return new CollectionSource(path.canonicalString(), {});
    }

    return s;
  });

  return new CorePipeline(pipeline.serializer, newStages);
}

export type QueryOrPipeline = Query | CorePipeline;

export function isPipeline(q: QueryOrPipeline): q is CorePipeline {
  return q instanceof CorePipeline;
}

export function stringifyQueryOrPipeline(q: QueryOrPipeline): string {
  if (isPipeline(q)) {
    return canonifyPipeline(q);
  }

  return stringifyQuery(q);
}

export function canonifyQueryOrPipeline(q: QueryOrPipeline): string {
  if (isPipeline(q)) {
    return canonifyPipeline(q);
  }

  return canonifyQuery(q);
}

export function queryOrPipelineEqual(
  left: QueryOrPipeline,
  right: QueryOrPipeline
): boolean {
  if (left instanceof CorePipeline && right instanceof CorePipeline) {
    return pipelineEq(left, right);
  }
  if (
    (left instanceof CorePipeline && !(right instanceof CorePipeline)) ||
    (!(left instanceof CorePipeline) && right instanceof CorePipeline)
  ) {
    return false;
  }

  return queryEquals(left as Query, right as Query);
}

export type TargetOrPipeline = Target | CorePipeline;

export function canonifyTargetOrPipeline(q: TargetOrPipeline): string {
  if (targetIsPipelineTarget(q)) {
    return canonifyPipeline(q);
  }

  return canonifyTarget(q as Target);
}

export function targetOrPipelineEqual(
  left: TargetOrPipeline,
  right: TargetOrPipeline
): boolean {
  if (left instanceof CorePipeline && right instanceof CorePipeline) {
    return pipelineEq(left, right);
  }
  if (
    (left instanceof CorePipeline && !(right instanceof CorePipeline)) ||
    (!(left instanceof CorePipeline) && right instanceof CorePipeline)
  ) {
    return false;
  }

  return targetEquals(left as Target, right as Target);
}

export function pipelineHasRanges(pipeline: CorePipeline): boolean {
  return pipeline.stages.some(
    stage => stage instanceof Limit || stage instanceof Offset
  );
}

function rewriteStages(stages: Stage[]): Stage[] {
  let hasOrder = false;
  const newStages: Stage[] = [];
  for (const stage of stages) {
    // For stages that provide ordering semantics
    if (stage instanceof Sort) {
      hasOrder = true;
      // Ensure we have a stable ordering
      if (
        stage.orderings.some(
          order =>
            order.expr instanceof Field &&
            order.expr.fieldName === DOCUMENT_KEY_NAME
        )
      ) {
        newStages.push(stage);
      } else {
        const copy = stage.orderings.map(o => o);
        copy.push(field(DOCUMENT_KEY_NAME).ascending());
        newStages.push(new Sort(copy, {}));
      }
    }
    // For stages whose semantics depend on ordering
    else if (stage instanceof Limit) {
      if (!hasOrder) {
        newStages.push(new Sort([field(DOCUMENT_KEY_NAME).ascending()], {}));
        hasOrder = true;
      }
      newStages.push(stage);
    } else {
      newStages.push(stage);
    }
  }

  if (!hasOrder) {
    newStages.push(new Sort([field(DOCUMENT_KEY_NAME).ascending()], {}));
  }

  return newStages;
}

function addSystemFields(
  fields: Map<string, Expression>
): Map<string, Expression> {
  const newFields = new Map<string, Expression>(fields);
  newFields.set(DOCUMENT_KEY_NAME, field(DOCUMENT_KEY_NAME));
  newFields.set(CREATE_TIME_NAME, field(CREATE_TIME_NAME));
  newFields.set(UPDATE_TIME_NAME, field(UPDATE_TIME_NAME));
  return newFields;
}

export function toCorePipeline(
  p: ApiPipeline | RealtimePipeline
): CorePipeline {
  return new CorePipeline(p.userDataReader.serializer, rewriteStages(p.stages));
}
