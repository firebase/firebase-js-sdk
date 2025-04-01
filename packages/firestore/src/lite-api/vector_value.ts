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
}
