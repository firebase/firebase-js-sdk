/**
 * @license
 * Copyright 2018 Google Inc.
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
import { assert } from '../util/assert';
import * as misc from '../util/misc';
import {
  ArrayValue,
  DoubleValue,
  FieldValue,
  IntegerValue,
  NumberValue,
  ServerTimestampValue
} from './field_value';

/** Represents a transform within a TransformMutation. */
export interface TransformOperation {
  /**
   * Computes the local transform result against the provided `previousValue`,
   * optionally using the provided localWriteTime.
   */
  applyToLocalView(
    previousValue: FieldValue | null,
    localWriteTime: Timestamp
  ): FieldValue;

  /**
   * Computes a final transform result after the transform has been acknowledged
   * by the server, potentially using the server-provided transformResult.
   */
  applyToRemoteDocument(
    previousValue: FieldValue | null,
    transformResult: FieldValue | null
  ): FieldValue;

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
  computeBaseValue(previousValue: FieldValue | null): FieldValue | null;

  isEqual(other: TransformOperation): boolean;
}

/** Transforms a value into a server-generated timestamp. */
export class ServerTimestampTransform implements TransformOperation {
  private constructor() {}
  static instance = new ServerTimestampTransform();

  applyToLocalView(
    previousValue: FieldValue | null,
    localWriteTime: Timestamp
  ): FieldValue {
    return new ServerTimestampValue(localWriteTime!, previousValue);
  }

  applyToRemoteDocument(
    previousValue: FieldValue | null,
    transformResult: FieldValue | null
  ): FieldValue {
    return transformResult!;
  }

  computeBaseValue(previousValue: FieldValue | null): FieldValue | null {
    return null; // Server timestamps are idempotent and don't require a base value.
  }

  isEqual(other: TransformOperation): boolean {
    return other instanceof ServerTimestampTransform;
  }
}

/** Transforms an array value via a union operation. */
export class ArrayUnionTransformOperation implements TransformOperation {
  constructor(readonly elements: FieldValue[]) {}

  applyToLocalView(
    previousValue: FieldValue | null,
    localWriteTime: Timestamp
  ): FieldValue {
    return this.apply(previousValue);
  }

  applyToRemoteDocument(
    previousValue: FieldValue | null,
    transformResult: FieldValue | null
  ): FieldValue {
    // The server just sends null as the transform result for array operations,
    // so we have to calculate a result the same as we do for local
    // applications.
    return this.apply(previousValue);
  }

  private apply(previousValue: FieldValue | null): FieldValue {
    const result = coercedFieldValuesArray(previousValue);
    for (const toUnion of this.elements) {
      if (!result.find(element => element.isEqual(toUnion))) {
        result.push(toUnion);
      }
    }
    return new ArrayValue(result);
  }

  computeBaseValue(previousValue: FieldValue | null): FieldValue | null {
    return null; // Array transforms are idempotent and don't require a base value.
  }

  isEqual(other: TransformOperation): boolean {
    return (
      other instanceof ArrayUnionTransformOperation &&
      misc.arrayEquals(other.elements, this.elements)
    );
  }
}

/** Transforms an array value via a remove operation. */
export class ArrayRemoveTransformOperation implements TransformOperation {
  constructor(readonly elements: FieldValue[]) {}

  applyToLocalView(
    previousValue: FieldValue | null,
    localWriteTime: Timestamp
  ): FieldValue {
    return this.apply(previousValue);
  }

  applyToRemoteDocument(
    previousValue: FieldValue | null,
    transformResult: FieldValue | null
  ): FieldValue {
    // The server just sends null as the transform result for array operations,
    // so we have to calculate a result the same as we do for local
    // applications.
    return this.apply(previousValue);
  }

  private apply(previousValue: FieldValue | null): FieldValue {
    let result = coercedFieldValuesArray(previousValue);
    for (const toRemove of this.elements) {
      result = result.filter(element => !element.isEqual(toRemove));
    }
    return new ArrayValue(result);
  }

  computeBaseValue(previousValue: FieldValue | null): FieldValue | null {
    return null; // Array transforms are idempotent and don't require a base value.
  }

  isEqual(other: TransformOperation): boolean {
    return (
      other instanceof ArrayRemoveTransformOperation &&
      misc.arrayEquals(other.elements, this.elements)
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
  constructor(readonly operand: NumberValue) {}

  applyToLocalView(
    previousValue: FieldValue | null,
    localWriteTime: Timestamp
  ): FieldValue {
    const baseValue = this.computeBaseValue(previousValue);
    // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
    // precision and resolves overflows by reducing precision, we do not
    // manually cap overflows at 2^63.

    // Return an integer value iff the previous value and the operand is an
    // integer.
    if (
      baseValue instanceof IntegerValue &&
      this.operand instanceof IntegerValue
    ) {
      const sum = baseValue.internalValue + this.operand.internalValue;
      return new IntegerValue(sum);
    } else {
      const sum = baseValue.internalValue + this.operand.internalValue;
      return new DoubleValue(sum);
    }
  }

  applyToRemoteDocument(
    previousValue: FieldValue | null,
    transformResult: FieldValue | null
  ): FieldValue {
    assert(
      transformResult !== null,
      "Didn't receive transformResult for NUMERIC_ADD transform"
    );
    return transformResult!;
  }

  /**
   * Inspects the provided value, returning the provided value if it is already
   * a NumberValue, otherwise returning a coerced IntegerValue of 0.
   */
  computeBaseValue(previousValue: FieldValue | null): NumberValue {
    return previousValue instanceof NumberValue
      ? previousValue
      : new IntegerValue(0);
  }

  isEqual(other: TransformOperation): boolean {
    return (
      other instanceof NumericIncrementTransformOperation &&
      this.operand.isEqual(other.operand)
    );
  }
}

function coercedFieldValuesArray(value: FieldValue | null): FieldValue[] {
  if (value instanceof ArrayValue) {
    return value.internalValue.slice();
  } else {
    // coerce to empty array.
    return [];
  }
}
