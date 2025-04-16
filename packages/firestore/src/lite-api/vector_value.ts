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

import { isPrimitiveArrayEqual } from '../util/array';
import { Code, FirestoreError } from '../util/error';

/**
 * Represents a vector type in Firestore documents.
 * Create an instance with <code>{@link vector}</code>.
 *
 * @class VectorValue
 */
export class VectorValue {
  private readonly _values: number[];

  /**
   * @private
   * @internal
   */
  constructor(values: number[] | undefined) {
    // Making a copy of the parameter.
    this._values = (values || []).map(n => n);
  }

  /**
   * Returns a copy of the raw number array form of the vector.
   */
  toArray(): number[] {
    return this._values.map(n => n);
  }

  /**
   * Returns `true` if the two `VectorValue` values have the same raw number arrays, returns `false` otherwise.
   */
  isEqual(other: VectorValue): boolean {
    return isPrimitiveArrayEqual(this._values, other._values);
  }

  /** Returns a JSON-serializable representation of this `VectorValue` instance. */
  toJSON(): object {
    return {
      type: 'firestore/vectorValue/1.0',
      vectorValues: this._values
    };
  }
  /** Builds a `Bytes` instance from a JSON serialized version of `Bytes`. */
  static fromJSON(json: object): VectorValue {
    const requiredFields = ['type', 'vectorValues'];
    let error: string | undefined = undefined;
    let data: number[] = [];
    for (const key of requiredFields) {
      if (!(key in json)) {
        error = `json missing required field: ${key}`;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const value = (json as any)[key];
      if (key === 'type') {
        if (typeof value !== 'string') {
          error = `json field 'type' must be a string.`;
          break;
        } else if (value !== 'firestore/vectorValue/1.0') {
          error = "Expected 'type' field to equal 'firestore/vectorValue/1.0'";
          break;
        }
      } else {
        // First, confirm it's actually an array
        if (
          Array.isArray(value) &&
          value.every(element => typeof element === 'number')
        ) {
          data = value;
        } else {
          error = "Expected 'vectorValues' field to be a number array";
          break;
        }
      }
    }
    if (error) {
      throw new FirestoreError(Code.INVALID_ARGUMENT, error);
    }
    return new VectorValue(data);
  }
}
