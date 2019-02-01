/**
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
import * as misc from '../util/misc';
import { ArrayValue, FieldValue, ServerTimestampValue } from './field_value';

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

  isEqual(other: TransformOperation): boolean {
    return (
      other instanceof ArrayRemoveTransformOperation &&
      misc.arrayEquals(other.elements, this.elements)
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
