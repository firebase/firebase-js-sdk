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

import { Timestamp } from '../lite-api/timestamp';
import { Value as ProtoValue } from '../protos/firestore_proto_api';
import { Serializer, toDouble, toInteger } from '../remote/number_serializer';
import { debugAssert } from '../util/assert';
import { arrayEquals } from '../util/misc';

import { normalizeNumber } from './normalize';
import { serverTimestamp } from './server_timestamps';
import { isArray, isInteger, isNumber, valueEquals } from './values';

/** Used to represent a field transform on a mutation. */
export class TransformOperation {
  // Make sure that the structural type of `TransformOperation` is unique.
  // See https://github.com/microsoft/TypeScript/issues/5451
  private _ = undefined;
}

/**
 * Computes the local transform result against the provided `previousValue`,
 * optionally using the provided localWriteTime.
 */
export function applyTransformOperationToLocalView(
  transform: TransformOperation,
  previousValue: ProtoValue | null,
  localWriteTime: Timestamp
): ProtoValue {
  if (transform instanceof ServerTimestampTransform) {
    return serverTimestamp(localWriteTime, previousValue);
  } else if (transform instanceof ArrayUnionTransformOperation) {
    return applyArrayUnionTransformOperation(transform, previousValue);
  } else if (transform instanceof ArrayRemoveTransformOperation) {
    return applyArrayRemoveTransformOperation(transform, previousValue);
  } else {
    debugAssert(
      transform instanceof NumericIncrementTransformOperation,
      'Expected NumericIncrementTransformOperation but was: ' + transform
    );
    return applyNumericIncrementTransformOperationToLocalView(
      transform,
      previousValue
    );
  }
}

/**
 * Computes a final transform result after the transform has been acknowledged
 * by the server, potentially using the server-provided transformResult.
 */
export function applyTransformOperationToRemoteDocument(
  transform: TransformOperation,
  previousValue: ProtoValue | null,
  transformResult: ProtoValue | null
): ProtoValue {
  // The server just sends null as the transform result for array operations,
  // so we have to calculate a result the same as we do for local
  // applications.
  if (transform instanceof ArrayUnionTransformOperation) {
    return applyArrayUnionTransformOperation(transform, previousValue);
  } else if (transform instanceof ArrayRemoveTransformOperation) {
    return applyArrayRemoveTransformOperation(transform, previousValue);
  }

  debugAssert(
    transformResult !== null,
    "Didn't receive transformResult for non-array transform"
  );
  return transformResult;
}

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
 * @returns a base value to store along with the mutation, or null for
 * idempotent transforms.
 */
export function computeTransformOperationBaseValue(
  transform: TransformOperation,
  previousValue: ProtoValue | null
): ProtoValue | null {
  if (transform instanceof NumericIncrementTransformOperation) {
    return isNumber(previousValue) ? previousValue! : { integerValue: 0 };
  }
  return null;
}

export function transformOperationEquals(
  left: TransformOperation,
  right: TransformOperation
): boolean {
  if (
    left instanceof ArrayUnionTransformOperation &&
    right instanceof ArrayUnionTransformOperation
  ) {
    return arrayEquals(left.elements, right.elements, valueEquals);
  } else if (
    left instanceof ArrayRemoveTransformOperation &&
    right instanceof ArrayRemoveTransformOperation
  ) {
    return arrayEquals(left.elements, right.elements, valueEquals);
  } else if (
    left instanceof NumericIncrementTransformOperation &&
    right instanceof NumericIncrementTransformOperation
  ) {
    return valueEquals(left.operand, right.operand);
  }

  return (
    left instanceof ServerTimestampTransform &&
    right instanceof ServerTimestampTransform
  );
}

/** Transforms a value into a server-generated timestamp. */
export class ServerTimestampTransform extends TransformOperation {}

/** Transforms an array value via a union operation. */
export class ArrayUnionTransformOperation extends TransformOperation {
  constructor(readonly elements: ProtoValue[]) {
    super();
  }
}

function applyArrayUnionTransformOperation(
  transform: ArrayUnionTransformOperation,
  previousValue: ProtoValue | null
): ProtoValue {
  const values = coercedFieldValuesArray(previousValue);
  for (const toUnion of transform.elements) {
    if (!values.some(element => valueEquals(element, toUnion))) {
      values.push(toUnion);
    }
  }
  return { arrayValue: { values } };
}

/** Transforms an array value via a remove operation. */
export class ArrayRemoveTransformOperation extends TransformOperation {
  constructor(readonly elements: ProtoValue[]) {
    super();
  }
}

function applyArrayRemoveTransformOperation(
  transform: ArrayRemoveTransformOperation,
  previousValue: ProtoValue | null
): ProtoValue {
  let values = coercedFieldValuesArray(previousValue);
  for (const toRemove of transform.elements) {
    values = values.filter(element => !valueEquals(element, toRemove));
  }
  return { arrayValue: { values } };
}

/**
 * Implements the backend semantics for locally computed NUMERIC_ADD (increment)
 * transforms. Converts all field values to integers or doubles, but unlike the
 * backend does not cap integer values at 2^63. Instead, JavaScript number
 * arithmetic is used and precision loss can occur for values greater than 2^53.
 */
export class NumericIncrementTransformOperation extends TransformOperation {
  constructor(readonly serializer: Serializer, readonly operand: ProtoValue) {
    super();
    debugAssert(
      isNumber(operand),
      'NumericIncrementTransform transform requires a NumberValue'
    );
  }
}

export function applyNumericIncrementTransformOperationToLocalView(
  transform: NumericIncrementTransformOperation,
  previousValue: ProtoValue | null
): ProtoValue {
  // PORTING NOTE: Since JavaScript's integer arithmetic is limited to 53 bit
  // precision and resolves overflows by reducing precision, we do not
  // manually cap overflows at 2^63.
  const baseValue = computeTransformOperationBaseValue(
    transform,
    previousValue
  )!;
  const sum = asNumber(baseValue) + asNumber(transform.operand);
  if (isInteger(baseValue) && isInteger(transform.operand)) {
    return toInteger(sum);
  } else {
    return toDouble(transform.serializer, sum);
  }
}

function asNumber(value: ProtoValue): number {
  return normalizeNumber(value.integerValue || value.doubleValue);
}

function coercedFieldValuesArray(value: ProtoValue | null): ProtoValue[] {
  return isArray(value) && value.arrayValue.values
    ? value.arrayValue.values.slice()
    : [];
}
