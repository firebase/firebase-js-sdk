/**
 * @license
 * Copyright 2025 Google LLC
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

import { Quadruple } from '../util/quadruple';

/**
 * Represents a 128-bit decimal type in Firestore documents.
 *
 * @class Decimal128Value
 */
export class Decimal128Value {
  readonly stringValue: string;
  private value: Quadruple;

  constructor(value: string) {
    this.stringValue = value;
    this.value = Quadruple.fromString(value);
  }

  /**
   * Returns true if this `Decimal128Value` is equal to the provided one.
   *
   * @param other - The `Decimal128Value` to compare against.
   * @return 'true' if this `Decimal128Value` is equal to the provided one.
   */
  isEqual(other: Decimal128Value): boolean {
    // Firestore considers +0 and -0 to be equal.
    if (this.value.isZero() && other.value.isZero()) {
      return true;
    }
    return this.value.compareTo(other.value) === 0;
  }
}
