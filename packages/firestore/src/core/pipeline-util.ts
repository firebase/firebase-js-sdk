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

import {
  Constant,
  Expr,
  Field,
  FilterCondition,
  FirestoreFunction,
  gt,
  gte,
  lt,
  lte,
  not,
  andFunction,
  orFunction,
  Ordering,
  And,
  ListOfExprs
} from '../lite-api/expressions';
import {
  isNanValue,
  isNullValue,
  VECTOR_MAP_VECTORS_KEY
} from '../model/values';
import {
  ArrayValue as ProtoArrayValue,
  Function as ProtoFunction,
  LatLng as ProtoLatLng,
  MapValue as ProtoMapValue,
  Pipeline as ProtoPipeline,
  Timestamp as ProtoTimestamp,
  Value as ProtoValue
} from '../protos/firestore_proto_api';
import { debugAssert, fail } from '../util/assert';
import { isPlainObject } from '../util/input_validation';

import {
  CompositeFilter as CompositeFilterInternal,
  CompositeOperator,
  FieldFilter as FieldFilterInternal,
  Filter as FilterInternal,
  Operator
} from './filter';
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
import { Pipeline } from '../lite-api/pipeline';
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
import { ResourcePath } from '../model/path';
import { Firestore } from '../api/database';
import { doc } from '../lite-api/reference';
import { Direction } from './order_by';
import { CorePipeline } from './pipeline_run';
import { Bound } from './bound';

/* eslint @typescript-eslint/no-explicit-any: 0 */

function isITimestamp(obj: any): obj is ProtoTimestamp {
  if (typeof obj !== 'object' || obj === null) {
    return false; // Must be a non-null object
  }
  if (
    'seconds' in obj &&
    (obj.seconds === null ||
      typeof obj.seconds === 'number' ||
      typeof obj.seconds === 'string') &&
    'nanos' in obj &&
    (obj.nanos === null || typeof obj.nanos === 'number')
  ) {
    return true;
  }

  return false;
}
function isILatLng(obj: any): obj is ProtoLatLng {
  if (typeof obj !== 'object' || obj === null) {
    return false; // Must be a non-null object
  }
  if (
    'latitude' in obj &&
    (obj.latitude === null || typeof obj.latitude === 'number') &&
    'longitude' in obj &&
    (obj.longitude === null || typeof obj.longitude === 'number')
  ) {
    return true;
  }

  return false;
}
function isIArrayValue(obj: any): obj is ProtoArrayValue {
  if (typeof obj !== 'object' || obj === null) {
    return false; // Must be a non-null object
  }
  if ('values' in obj && (obj.values === null || Array.isArray(obj.values))) {
    return true;
  }

  return false;
}
function isIMapValue(obj: any): obj is ProtoMapValue {
  if (typeof obj !== 'object' || obj === null) {
    return false; // Must be a non-null object
  }
  if ('fields' in obj && (obj.fields === null || isPlainObject(obj.fields))) {
    return true;
  }

  return false;
}
function isIFunction(obj: any): obj is ProtoFunction {
  if (typeof obj !== 'object' || obj === null) {
    return false; // Must be a non-null object
  }
  if (
    'name' in obj &&
    (obj.name === null || typeof obj.name === 'string') &&
    'args' in obj &&
    (obj.args === null || Array.isArray(obj.args))
  ) {
    return true;
  }

  return false;
}

function isIPipeline(obj: any): obj is ProtoPipeline {
  if (typeof obj !== 'object' || obj === null) {
    return false; // Must be a non-null object
  }
  if ('stages' in obj && (obj.stages === null || Array.isArray(obj.stages))) {
    return true;
  }

  return false;
}

export function isFirestoreValue(obj: any): obj is ProtoValue {
  if (typeof obj !== 'object' || obj === null) {
    return false; // Must be a non-null object
  }

  // Check optional properties and their types
  if (
    ('nullValue' in obj &&
      (obj.nullValue === null || obj.nullValue === 'NULL_VALUE')) ||
    ('booleanValue' in obj &&
      (obj.booleanValue === null || typeof obj.booleanValue === 'boolean')) ||
    ('integerValue' in obj &&
      (obj.integerValue === null ||
        typeof obj.integerValue === 'number' ||
        typeof obj.integerValue === 'string')) ||
    ('doubleValue' in obj &&
      (obj.doubleValue === null || typeof obj.doubleValue === 'number')) ||
    ('timestampValue' in obj &&
      (obj.timestampValue === null || isITimestamp(obj.timestampValue))) ||
    ('stringValue' in obj &&
      (obj.stringValue === null || typeof obj.stringValue === 'string')) ||
    ('bytesValue' in obj &&
      (obj.bytesValue === null || obj.bytesValue instanceof Uint8Array)) ||
    ('referenceValue' in obj &&
      (obj.referenceValue === null ||
        typeof obj.referenceValue === 'string')) ||
    ('geoPointValue' in obj &&
      (obj.geoPointValue === null || isILatLng(obj.geoPointValue))) ||
    ('arrayValue' in obj &&
      (obj.arrayValue === null || isIArrayValue(obj.arrayValue))) ||
    ('mapValue' in obj &&
      (obj.mapValue === null || isIMapValue(obj.mapValue))) ||
    ('fieldReferenceValue' in obj &&
      (obj.fieldReferenceValue === null ||
        typeof obj.fieldReferenceValue === 'string')) ||
    ('functionValue' in obj &&
      (obj.functionValue === null || isIFunction(obj.functionValue))) ||
    ('pipelineValue' in obj &&
      (obj.pipelineValue === null || isIPipeline(obj.pipelineValue)))
  ) {
    return true;
  }

  return false;
}

export function toPipelineFilterCondition(
  f: FilterInternal
): FilterCondition & Expr {
  if (f instanceof FieldFilterInternal) {
    const field = Field.of(f.field.toString());
    if (isNanValue(f.value)) {
      if (f.op === Operator.EQUAL) {
        return andFunction(field.exists(), field.isNaN());
      } else {
        return andFunction(field.exists(), not(field.isNaN()));
      }
    } else if (isNullValue(f.value)) {
      if (f.op === Operator.EQUAL) {
        return andFunction(field.exists(), field.eq(null));
      } else {
        return andFunction(field.exists(), not(field.eq(null)));
      }
    } else {
      // Comparison filters
      const value = f.value;
      switch (f.op) {
        case Operator.LESS_THAN:
          return andFunction(
            field.exists(),
            field.lt(Constant._fromProto(value))
          );
        case Operator.LESS_THAN_OR_EQUAL:
          return andFunction(
            field.exists(),
            field.lte(Constant._fromProto(value))
          );
        case Operator.GREATER_THAN:
          return andFunction(
            field.exists(),
            field.gt(Constant._fromProto(value))
          );
        case Operator.GREATER_THAN_OR_EQUAL:
          return andFunction(
            field.exists(),
            field.gte(Constant._fromProto(value))
          );
        case Operator.EQUAL:
          return andFunction(
            field.exists(),
            field.eq(Constant._fromProto(value))
          );
        case Operator.NOT_EQUAL:
          return andFunction(
            field.exists(),
            field.neq(Constant._fromProto(value))
          );
        case Operator.ARRAY_CONTAINS:
          return andFunction(
            field.exists(),
            field.arrayContains(Constant._fromProto(value))
          );
        case Operator.IN: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant._fromProto(val)
          );
          return andFunction(field.exists(), field.eqAny(...values!));
        }
        case Operator.ARRAY_CONTAINS_ANY: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant._fromProto(val)
          );
          return andFunction(
            field.exists(),
            field.arrayContainsAny(...values!)
          );
        }
        case Operator.NOT_IN: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant._fromProto(val)
          );
          return andFunction(field.exists(), not(field.eqAny(...values!)));
        }
        default:
          fail('Unexpected operator');
      }
    }
  } else if (f instanceof CompositeFilterInternal) {
    switch (f.op) {
      case CompositeOperator.AND: {
        const conditions = f
          .getFilters()
          .map(f => toPipelineFilterCondition(f));
        return andFunction(conditions[0], ...conditions.slice(1));
      }
      case CompositeOperator.OR: {
        const conditions = f
          .getFilters()
          .map(f => toPipelineFilterCondition(f));
        return orFunction(conditions[0], ...conditions.slice(1));
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
    pipeline = pipeline.where(toPipelineFilterCondition(filter));
  }

  // orders
  const orders = queryNormalizedOrderBy(query);
  const existsConditions = orders.map(order =>
    Field.of(order.field.canonicalString()).exists()
  );
  if (existsConditions.length > 1) {
    pipeline = pipeline.where(
      andFunction(existsConditions[0], ...existsConditions.slice(1))
    );
  } else {
    pipeline = pipeline.where(existsConditions[0]);
  }

  const orderings = orders.map(order =>
    order.dir === Direction.ASCENDING
      ? Field.of(order.field.canonicalString()).ascending()
      : Field.of(order.field.canonicalString()).descending()
  );

  if (query.limitType === LimitType.Last) {
    pipeline = pipeline.sort(...reverseOrderings(orderings));
    // cursors
    if (query.startAt !== null) {
      pipeline = pipeline.where(
        whereConditionsFromCursor(query.startAt, orderings, 'before')
      );
    }

    if (query.endAt !== null) {
      pipeline = pipeline.where(
        whereConditionsFromCursor(query.endAt, orderings, 'after')
      );
    }

    pipeline = pipeline._limit(query.limit!, true);
    pipeline = pipeline.sort(...orderings);
  } else {
    pipeline = pipeline.sort(...orderings);
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

  return pipeline;
}

function whereConditionsFromCursor(
  bound: Bound,
  orderings: Ordering[],
  position: 'before' | 'after'
): And {
  const cursors = bound.position.map(value => Constant._fromProto(value));
  const filterFunc = position === 'before' ? lt : gt;
  const filterInclusiveFunc = position === 'before' ? lte : gte;
  const conditions = cursors.map((cursor, index) => {
    if (!!bound.inclusive && index === cursors.length - 1) {
      return filterInclusiveFunc(orderings[index].expr as Field, cursor);
    } else {
      return filterFunc(orderings[index].expr as Field, cursor);
    }
  });
  return new And(conditions);
}

function canonifyExpr(expr: Expr): string {
  if (expr instanceof Field) {
    return `fld(${expr.fieldName()})`;
  }
  if (expr instanceof Constant) {
    // TODO(pipeline): use better alternatives than JSON.stringify
    return `cst(${JSON.stringify(expr.value)})`;
  }
  if (expr instanceof FirestoreFunction) {
    return `fn(${expr.name},[${expr.params.map(canonifyExpr).join(',')}])`;
  }
  if (expr instanceof ListOfExprs) {
    return `list([${expr.exprs.map(canonifyExpr).join(',')}])`;
  }
  throw new Error(`Unrecognized expr ${JSON.stringify(expr, null, 2)}`);
}

function canonifySortOrderings(orders: Ordering[]): string {
  return orders.map(o => `${canonifyExpr(o.expr)} ${o.direction}`).join(',');
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
