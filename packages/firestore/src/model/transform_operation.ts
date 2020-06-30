/**
 * @license
 * Copyright 2018 Google LLC
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

import { Timestamp } from '../api/timestamp';
import * as api from '../protos/firestore_proto_api';
import { JsonProtoSerializer, toDouble, toInteger } from '../remote/serializer';
import { debugAssert } from '../util/assert';
import { arrayEquals } from '../util/misc';

import { serverTimestamp } from './server_timestamps';
import {
  isArray,
  isInteger,
  isNumber,
  normalizeNumber,
  valueEquals
} from './values';

/** Represents a transform within a TransformMutation. */
export interface TransformOperation {
  /**
   * Computes the local transform result against the provided `previousValue`,
   * optionally using the provided localWriteTime.
   */
  applyToLocalView(
    previousValue: api.Value | null,
    localWriteTime: Timestamp
  ): api.Value;

  /**
   * Computes a final transform result after the transform has been acknowledged
   * by the server, potentially using the server-provided transformResult.
   */
  applyToRemoteDocument(
    previousValue: api.Value | null,
    transformResult: api.Value | null
  ): api.Value;

  /**
   * If this transform operation is not idempotent, returns the base value to
   * persist for this transform. If a base value is returned, the transform
   * operation is always applied to this base value, even if document has
   * already been updated.
   *
   * Base values provide consistent behavior for non-idempotent transforms and
   * allow us to return the same latency-compensated value even if the backend
   * has already applied the transform operation. The base value is null for
   * idempotent transforms, as they can be re-played even if the backend has
   * already applied them.
   *
   * @return a base value to store along with the mutation, or null for
   * idempotent transforms.
   */
  computeBaseValue(previousValue: api.Value | null): api.Value | null;

  isEqual(other: TransformOperation): boolean;
}

/** Transforms a value into a server-generated timestamp. */
export class ServerTimestampTransform implements TransformOperation {
  private constructor() {}
  static instance = new ServerTimestampTransform();

  applyToLocalView(
    previousValue: api.Value | null,
    localWriteTime: Timestamp
  ): api.Value {
    return serverTimestamp(localWriteTime!, previousValue);
  }

  applyToRemoteDocument(
    previousValue: api.Value | null,
    transformResult: api.Value | null
  ): api.Value {
    return transformResult!;
  }

  computeBaseValue(previousValue: api.Value | null): api.Value | null {
    return null; // Server timestamps are idempotent and don't require a base value.
  }

  isEqual(other: TransformOperation): boolean {
    return other instanceof ServerTimestampTransform;
  }
}

/** Transforms an array value via a union operation. */
export class ArrayUnionTransformOperation implements TransformOperation {
  constructor(readonly elements: api.Value[]) {}

  applyToLocalView(
    previousValue: api.Value | null,
    localWriteTime: Timestamp
  ): api.Value {
    return this.apply(previousValue);
  }

  applyToRemoteDocument(
    previousValue: api.Value | null,
    transformResult: api.Value | null
  ): api.Value {
    // The server just sends null as the transform result for array operations,
    // so we have to calculate a result the same as we do for local
    // applications.
    return this.apply(previousValue);
  }

  private apply(previousValue: api.Value | null): api.Value {
    const values = coercedFieldValuesArray(previousValue);
    for (const toUnion of this.elements) {
      if (!values.some(element => valueEquals(element, toUnion))) {
        values.push(toUnion);
      }
    }
    return { arrayValue: { values } };
  }

  computeBaseValue(previousValue: api.Value | null): api.Value | null {
    return null; // Array transforms are idempotent and don't require a base value.
  }

  isEqual(other: TransformOperation): boolean {
    return (
      other instanceof ArrayUnionTransformOperation &&
      arrayEquals(this.elements, other.elements, valueEquals)
    );
  }
}

/** Transforms an array value via a remove operation. */
export class ArrayRemoveTransformOperation implements TransformOperation {
  constructor(readonly elements: api.Value[]) {}

  applyToLocalView(
    previousValue: api.Value | null,
    localWriteTime: Timestamp
  ): api.Value {
    return this.apply(previousValue);
  }

  applyToRemoteDocument(
    previousValue: api.Value | null,
    transformResult: api.Value | null
  ): api.Value {
    // The server just sends null as the transform result for array operations,
    // so we have to calculate a result the same as we do for local
    // applications.
    return this.apply(previousValue);
  }

  private apply(previousValue: api.Value | null): api.Value {
    let values = coercedFieldValuesArray(previousValue);
    for (const toRemove of this.elements) {
      values = values.filter(element => !valueEquals(element, toRemove));
    }
    return { arrayValue: { values } };
  }

  computeBaseValue(previousValue: api.Value | null): api.Value | null {
    return null; // Array transforms are idempotent and don't require a base value.
  }

  isEqual(other: TransformOperation): boolean {
    return (
      other instanceof ArrayRemoveTransformOperation &&
      arrayEquals(this.elements, other.elements, valueEquals)
    );
  }
}

/**
 * Implements the backend semantics for locally computed NUMERIC_ADD (increment)
 * transforms. Converts all field values to integers or doubles, but unlike the
 * backend does not cap integer values at 2^63. Instead, JavaScript number
 * arithmetic is used and precision loss can occur for values greater than 2^53.
 */
export class NumericIncrementTransformOperation implements TransformOperation {
  constructor(
    private readonly serializer: JsonProtoSerializer,
    readonly operand: api.Value
  ) {
    debugAssert(
      isNumber(operand),
      'NumericIncrementTransform transform requires a NumberValue'
    );
  }

  applyToLocalView(
    previousValue: api.Value | null,
    localWriteTime: Timestamp
  ): api.Value {
    // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
    // precision and resolves overflows by reducing precision, we do not
    // manually cap overflows at 2^63.
    const baseValue = this.computeBaseValue(previousValue);
    const sum = this.asNumber(baseValue) + this.asNumber(this.operand);
    if (isInteger(baseValue) && isInteger(this.operand)) {
      return toInteger(sum);
    } else {
      return toDouble(this.serializer, sum);
    }
  }

  applyToRemoteDocument(
    previousValue: api.Value | null,
    transformResult: api.Value | null
  ): api.Value {
    debugAssert(
      transformResult !== null,
      "Didn't receive transformResult for NUMERIC_ADD transform"
    );
    return transformResult;
  }

  /**
   * Inspects the provided value, returning the provided value if it is already
   * a NumberValue, otherwise returning a coerced value of 0.
   */
  computeBaseValue(previousValue: api.Value | null): api.Value {
    return isNumber(previousValue) ? previousValue! : { integerValue: 0 };
  }

  isEqual(other: TransformOperation): boolean {
    return (
      other instanceof NumericIncrementTransformOperation &&
      valueEquals(this.operand, other.operand)
    );
  }

  private asNumber(value: api.Value): number {
    return normalizeNumber(value.integerValue || value.doubleValue);
  }
}

function coercedFieldValuesArray(value: api.Value | null): api.Value[] {
  return isArray(value) && value.arrayValue.values
    ? value.arrayValue.values.slice()
    : [];
}
