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
  Expr,
  Field,
  BooleanExpr,
  and,
  or,
  Ordering,
  lt,
  gt,
  lte,
  gte,
  eq,
  field,
  FunctionExpr,
  ListOfExprs,
  AggregateFunction
} from '../lite-api/expressions';
import { Pipeline, Pipeline as ApiPipeline } from '../lite-api/pipeline';
import { doc } from '../lite-api/reference';
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
import { CorePipeline } from './pipeline_run';
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

      pipeline = pipeline._limit(query.limit!, true);
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
  const cursors = bound.position.map(value => Constant._fromProto(value));
  const filterFunc = position === 'before' ? lt : gt;
  const filterInclusiveFunc = position === 'before' ? lte : gte;

  const orConditions: BooleanExpr[] = [];
  for (let i = 1; i <= orderings.length; i++) {
    const cursorSubset = cursors.slice(0, i);

    const conditions: BooleanExpr[] = cursorSubset.map((cursor, index) => {
      if (index < cursorSubset.length - 1) {
        return eq(orderings[index].expr as Field, cursor);
      } else if (bound.inclusive && i === orderings.length - 1) {
        return filterInclusiveFunc(orderings[index].expr as Field, cursor);
      } else {
        return filterFunc(orderings[index].expr as Field, cursor);
      }
    });

    if (conditions.length === 1) {
      orConditions.push(conditions[0]);
    } else {
      orConditions.push(
        and(conditions[0], conditions[1], ...conditions.slice(2))
      );
    }
  }

  if (orConditions.length === 1) {
    return orConditions[0];
  } else {
    return or(orConditions[0], orConditions[1], ...orConditions.slice(2));
  }
}

export function canonifyExpr(expr: Expr): string {
  if (expr instanceof Field) {
    return `fld(${expr.fieldName()})`;
  }
  if (expr instanceof Constant) {
    // TODO(pipeline): use better alternatives than JSON.stringify
    return `cst(${JSON.stringify(expr.value)})`;
  }
  if (expr instanceof FunctionExpr || expr instanceof AggregateFunction) {
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
    return `${stage.name}(${canonifyExprMap(stage.fields)})`;
  }
  if (stage instanceof Aggregate) {
    let result = `${stage.name}(${canonifyExprMap(
      stage.accumulators as unknown as Map<string, Expr>
    )})`;
    if (stage.groups.size > 0) {
      result = result + `grouping(${canonifyExprMap(stage.groups)})`;
    }
    return result;
  }
  if (stage instanceof Distinct) {
    return `${stage.name}(${canonifyExprMap(stage.groups)})`;
  }
  if (stage instanceof CollectionSource) {
    return `${stage.name}(${stage.collectionPath})`;
  }
  if (stage instanceof CollectionGroupSource) {
    return `${stage.name}(${stage.collectionId})`;
  }
  if (stage instanceof DatabaseSource) {
    return `${stage.name}()`;
  }
  if (stage instanceof DocumentsSource) {
    return `${stage.name}(${stage.docPaths.sort()})`;
  }
  if (stage instanceof Where) {
    return `${stage.name}(${canonifyExpr(stage.condition)})`;
  }
  if (stage instanceof FindNearest) {
    const vector = stage._vectorValue.value.mapValue.fields![
      VECTOR_MAP_VECTORS_KEY
    ].arrayValue?.values?.map(value => value.doubleValue);
    let result = `${stage.name}(${canonifyExpr(stage._field)},${
      stage._distanceMeasure
    },[${vector}]`;
    if (!!stage._limit) {
      result = result + `,${stage._limit}`;
    }
    if (!!stage._distanceField) {
      result = result + `,${stage._distanceField}`;
    }
    return result + ')';
  }
  if (stage instanceof Limit) {
    return `${stage.name}(${stage.limit})`;
  }
  if (stage instanceof Offset) {
    return `${stage.name}(${stage.offset})`;
  }
  if (stage instanceof Select) {
    return `${stage.name}(${canonifyExprMap(stage.projections)})`;
  }
  if (stage instanceof Sort) {
    return `${stage.name}(${canonifySortOrderings(stage.orders)})`;
  }

  throw new Error(`Unrecognized stage ${stage.name}`);
}

function canonifyExprMap(map: Map<string, Expr>): string {
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

export function getPipelineFlavor(p: CorePipeline): PipelineFlavor {
  let flavor: PipelineFlavor = 'exact';
  p.stages.forEach((stage, index) => {
    if (stage.name === Distinct.name || stage.name === Aggregate.name) {
      flavor = 'keyless';
    }
    if (stage.name === Select.name && flavor === 'exact') {
      flavor = 'augmented';
    }
    // TODO(pipeline): verify the last stage is addFields, and it is added by the SDK.
    if (
      stage.name === AddFields.name &&
      index < p.stages.length - 1 &&
      flavor === 'exact'
    ) {
      flavor = 'augmented';
    }
  });

  return flavor;
}

export type PipelineSourceType =
  | 'collection'
  | 'collection_group'
  | 'database'
  | 'documents';

export function getPipelineSourceType(
  p: CorePipeline
): PipelineSourceType | 'unknown' {
  debugAssert(p.stages.length > 0, 'Pipeline must have at least one stage');
  const source = p.stages[0];

  if (
    source instanceof CollectionSource ||
    source instanceof CollectionGroupSource ||
    source instanceof DatabaseSource ||
    source instanceof DocumentsSource
  ) {
    return source.name as PipelineSourceType;
  }

  return 'unknown';
}

export function getPipelineCollection(p: CorePipeline): string | undefined {
  if (getPipelineSourceType(p) === 'collection') {
    return (p.stages[0] as CollectionSource).collectionPath;
  }
  return undefined;
}

export function getPipelineCollectionGroup(
  p: CorePipeline
): string | undefined {
  if (getPipelineSourceType(p) === 'collection_group') {
    return (p.stages[0] as CollectionGroupSource).collectionId;
  }
  return undefined;
}

export function getPipelineCollectionId(p: CorePipeline): string | undefined {
  switch (getPipelineSourceType(p)) {
    case 'collection':
      return ResourcePath.fromString(getPipelineCollection(p)!).lastSegment();
    case 'collection_group':
      return getPipelineCollectionGroup(p);
    default:
      return undefined;
  }
}

export function asCollectionPipelineAtPath(
  pipeline: CorePipeline,
  path: ResourcePath
): CorePipeline {
  const newStages = pipeline.stages.map(s => {
    if (s instanceof CollectionGroupSource) {
      return new CollectionSource(path.canonicalString());
    }

    return s;
  });

  return new CorePipeline(pipeline.serializer, newStages);
}

export function getPipelineDocuments(p: CorePipeline): string[] | undefined {
  if (getPipelineSourceType(p) === 'documents') {
    return (p.stages[0] as DocumentsSource).docPaths;
  }
  return undefined;
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
      // add exists to force sparse semantics
      // Is this really needed?
      // newStages.push(new Where(new And(stage.orders.map(order => order.expr.exists()))));

      // Ensure we have a stable ordering
      if (
        stage.orders.some(
          order =>
            order.expr instanceof Field &&
            order.expr.fieldName() === DOCUMENT_KEY_NAME
        )
      ) {
        newStages.push(stage);
      } else {
        const copy = stage.orders.map(o => o);
        copy.push(field(DOCUMENT_KEY_NAME).ascending());
        newStages.push(new Sort(copy));
      }
    }
    // For stages whose semantics depend on ordering
    else if (stage instanceof Limit) {
      if (!hasOrder) {
        newStages.push(new Sort([field(DOCUMENT_KEY_NAME).ascending()]));
        hasOrder = true;
      }
      newStages.push(stage);
    }
    // For stages augmenting outputs
    else if (stage instanceof AddFields || stage instanceof Select) {
      if (stage instanceof AddFields) {
        newStages.push(new AddFields(addSystemFields(stage.fields)));
      } else {
        newStages.push(new Select(addSystemFields(stage.projections)));
      }
    } else {
      newStages.push(stage);
    }
  }

  if (!hasOrder) {
    newStages.push(new Sort([field(DOCUMENT_KEY_NAME).ascending()]));
  }

  return newStages;
}

function addSystemFields(fields: Map<string, Expr>): Map<string, Expr> {
  const newFields = new Map<string, Expr>(fields);
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
