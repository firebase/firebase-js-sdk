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

import { Firestore } from '../api/database';
import {
  Constant,
  Field,
  FilterCondition,
  not,
  andFunction,
  orFunction,
  Ordering,
  And,
  lt,
  gt,
  lte,
  gte,
  Expr,
  eq,
  Or
} from '../lite-api/expressions';
import { Pipeline } from '../lite-api/pipeline';
import { doc } from '../lite-api/reference';
import { isNanValue, isNullValue } from '../model/values';
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

export function toPipelineFilterCondition(f: FilterInternal): FilterCondition {
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
          return andFunction(field.exists(), field.lt(value));
        case Operator.LESS_THAN_OR_EQUAL:
          return andFunction(field.exists(), field.lte(value));
        case Operator.GREATER_THAN:
          return andFunction(field.exists(), field.gt(value));
        case Operator.GREATER_THAN_OR_EQUAL:
          return andFunction(field.exists(), field.gte(value));
        case Operator.EQUAL:
          return andFunction(field.exists(), field.eq(value));
        case Operator.NOT_EQUAL:
          return andFunction(field.exists(), field.neq(value));
        case Operator.ARRAY_CONTAINS:
          return andFunction(field.exists(), field.arrayContains(value));
        case Operator.IN: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant.of(val)
          );
          return andFunction(field.exists(), field.eqAny(...values!));
        }
        case Operator.ARRAY_CONTAINS_ANY: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant.of(val)
          );
          return andFunction(field.exists(), field.arrayContainsAny(values!));
        }
        case Operator.NOT_IN: {
          const values = value?.arrayValue?.values?.map((val: any) =>
            Constant.of(val)
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
): Expr {
  const cursors = bound.position.map(value => Constant._fromProto(value));
  const filterFunc = position === 'before' ? lt : gt;
  const filterInclusiveFunc = position === 'before' ? lte : gte;

  const orConditions = [];
  for (let i = 1; i <= orderings.length; i++) {
    const cursorSubset = cursors.slice(0, i);

    const conditions = cursorSubset.map((cursor, index) => {
      if (index < cursorSubset.length - 1) {
        return eq(orderings[index].expr as Field, cursor);
      } else if (!!bound.inclusive && i === orderings.length) {
        return filterInclusiveFunc(orderings[index].expr as Field, cursor);
      } else {
        return filterFunc(orderings[index].expr as Field, cursor);
      }
    });

    if (conditions.length === 1) {
      orConditions.push(conditions[0]);
    } else {
      orConditions.push(new And(conditions));
    }
  }

  if (orConditions.length === 1) {
    return orConditions[0];
  } else {
    return new Or(orConditions);
  }
}
