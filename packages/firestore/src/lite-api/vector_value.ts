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
// API extractor fails importing 'property' unless we also explicitly import 'Property'.
// eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-imports-ts
import { Property, property, validateJSON } from '../util/json_validation';

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

  static _jsonSchemaVersion: string = 'firestore/vectorValue/1.0';
  static _jsonSchema = {
    type: property('string', VectorValue._jsonSchemaVersion),
    vectorValues: property('object')
  };

  /**
   * Returns a JSON-serializable representation of this `VectorValue` instance.
   *
   * @returns a JSON representation of this object.
   */
  toJSON(): object {
    return {
      type: VectorValue._jsonSchemaVersion,
      vectorValues: this._values
    };
  }

  /**
   * Builds a `VectorValue` instance from a JSON object created by {@link VectorValue.toJSON}.
   *
   * @param json a JSON object represention of a `VectorValue` instance
   * @returns an instance of {@link VectorValue} if the JSON object could be parsed. Throws a
   * {@link FirestoreError} if an error occurs.
   */
  static fromJSON(json: object): VectorValue {
    if (validateJSON(json, VectorValue._jsonSchema)) {
      if (
        Array.isArray(json.vectorValues) &&
        json.vectorValues.every(element => typeof element === 'number')
      ) {
        return new VectorValue(json.vectorValues);
      }
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        "Expected 'vectorValues' field to be a number array"
      );
    }
    throw new FirestoreError(
      Code.INTERNAL,
      'Unexpected error creating Timestamp from JSON.'
    );
  }
}
