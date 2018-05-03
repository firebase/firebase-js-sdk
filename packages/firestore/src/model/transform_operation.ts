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

import { FieldValue, ServerTimestampValue, ArrayValue } from './field_value';
import { Timestamp } from '../api/timestamp';
import * as misc from '../util/misc';
import { assert } from '../util/assert';

/** Represents a transform within a TransformMutation. */
export interface TransformOperation {
  /** Transforms the provided `previousValue`. */
  transform(previousValue: FieldValue, localWriteTime?: Timestamp): FieldValue;

  isEqual(other: TransformOperation): boolean;
}

/** Transforms a value into a server-generated timestamp. */
export class ServerTimestampTransform implements TransformOperation {
  private constructor() {}
  static instance = new ServerTimestampTransform();

  transform(previousValue: FieldValue, localWriteTime?: Timestamp): FieldValue {
    assert(
      localWriteTime !== undefined,
      'ServerTimestampTransform.transform() requires localWriteTime.'
    );
    return new ServerTimestampValue(localWriteTime!, previousValue);
  }

  isEqual(other: TransformOperation): boolean {
    return other instanceof ServerTimestampTransform;
  }
}

/** Transforms an array value via a union operation. */
export class ArrayUnionTransformOperation implements TransformOperation {
  constructor(readonly elements: FieldValue[]) {}

  transform(previousValue: FieldValue, localWriteTime?: Timestamp): FieldValue {
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

  transform(previousValue: FieldValue, localWriteTime?: Timestamp): FieldValue {
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
