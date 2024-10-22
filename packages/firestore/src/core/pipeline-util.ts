// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  and,
  Constant,
  Expr,
  Field,
  FilterCondition,
  FirestoreFunction,
  not,
  or,
  Ordering
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
import { fail } from '../util/assert';
import { isPlainObject } from '../util/input_validation';

import {
  CompositeFilter as CompositeFilterInternal,
  CompositeOperator,
  FieldFilter as FieldFilterInternal,
  Filter as FilterInternal,
  Operator
} from './filter';
import { Pipeline } from '../lite-api/pipeline';
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
        return and(field.exists(), field.isNaN());
      } else {
        return and(field.exists(), not(field.isNaN()));
      }
    } else if (isNullValue(f.value)) {
      if (f.op === Operator.EQUAL) {
        return and(field.exists(), field.eq(null));
      } else {
        return and(field.exists(), not(field.eq(null)));
      }
    } else {
      // Comparison filters
      const value = f.value;
      switch (f.op) {
        case Operator.LESS_THAN:
          return and(field.exists(), field.lt(value));
        case Operator.LESS_THAN_OR_EQUAL:
          return and(field.exists(), field.lte(value));
        case Operator.GREATER_THAN:
          return and(field.exists(), field.gt(value));
        case Operator.GREATER_THAN_OR_EQUAL:
          return and(field.exists(), field.gte(value));
        case Operator.EQUAL:
          return and(field.exists(), field.eq(value));
        case Operator.NOT_EQUAL:
          return and(field.exists(), field.neq(value));
        case Operator.ARRAY_CONTAINS:
          return and(field.exists(), field.arrayContains(value));
        case Operator.IN: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant.of(val)
          );
          return and(field.exists(), field.in(...values!));
        }
        case Operator.ARRAY_CONTAINS_ANY: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant.of(val)
          );
          return and(field.exists(), field.arrayContainsAny(values!));
        }
        case Operator.NOT_IN: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant.of(val)
          );
          return and(field.exists(), not(field.in(...values!)));
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
        return and(conditions[0], ...conditions.slice(1));
      }
      case CompositeOperator.OR: {
        const conditions = f
          .getFilters()
          .map(f => toPipelineFilterCondition(f));
        return or(conditions[0], ...conditions.slice(1));
      }
      default:
        fail('Unexpected operator');
    }
  }

  throw new Error(`Failed to convert filter to pipeline conditions: ${f}`);
}

function canonifyExpr(expr: Expr): string {
  if (expr instanceof Field) {
    return `fld(${expr.fieldName()})`;
  }
  if (expr instanceof Constant) {
    return `cst(${expr.value})`;
  }
  if (expr instanceof FirestoreFunction) {
    return `fn(${expr.name},[${expr.params.map(canonifyExpr).join(',')}])`;
  }
  throw new Error(`Unrecognized expr ${expr}`);
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

export function canonifyPipeline(p: Pipeline): string {
  return p.stages.map(s => canonifyStage(s)).join('|');
}

// TODO(pipeline): do a proper implementation for eq.
export function pipelineEq(left: Pipeline, right: Pipeline): boolean {
  return canonifyPipeline(left) === canonifyPipeline(right);
}
