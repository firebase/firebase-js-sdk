/**
 * @license
 * Copyright 2020 Google LLC
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

import { debugAssert } from '../util/assert';
import { arrayEquals } from '../util/misc';
import { SortedSet } from '../util/sorted_set';

import { FieldPath } from './path';

/**
 * Provides a set of fields that can be used to partially patch a document.
 * FieldMask is used in conjunction with ObjectValue.
 * Examples:
 *   foo - Overwrites foo entirely with the provided value. If foo is not
 *         present in the companion ObjectValue, the field is deleted.
 *   foo.bar - Overwrites only the field bar of the object foo.
 *             If foo is not an object, foo is replaced with an object
 *             containing foo
 */
export class FieldMask {
  constructor(readonly fields: FieldPath[]) {
    // TODO(dimond): validation of FieldMask
    // Sort the field mask to support `FieldMask.isEqual()` and assert below.
    fields.sort(FieldPath.comparator);
    debugAssert(
      !fields.some((v, i) => i !== 0 && v.isEqual(fields[i - 1])),
      'FieldMask contains field that is not unique: ' +
        fields.find((v, i) => i !== 0 && v.isEqual(fields[i - 1]))!
    );
  }

  static empty(): FieldMask {
    return new FieldMask([]);
  }

  /**
   * Returns a new FieldMask object that is the result of adding all the given
   * fields paths to this field mask.
   */
  unionWith(extraFields: FieldPath[]): FieldMask {
    let mergedMaskSet = new SortedSet<FieldPath>(FieldPath.comparator);
    for (const fieldPath of this.fields) {
      mergedMaskSet = mergedMaskSet.add(fieldPath);
    }
    for (const fieldPath of extraFields) {
      mergedMaskSet = mergedMaskSet.add(fieldPath);
    }
    return new FieldMask(mergedMaskSet.toArray());
  }

  /**
   * Verifies that `fieldPath` is included by at least one field in this field
   * mask.
   *
   * This is an O(n) operation, where `n` is the size of the field mask.
   */
  covers(fieldPath: FieldPath): boolean {
    for (const fieldMaskPath of this.fields) {
      if (fieldMaskPath.isPrefixOf(fieldPath)) {
        return true;
      }
    }
    return false;
  }

  isEqual(other: FieldMask): boolean {
    return arrayEquals(this.fields, other.fields, (l, r) => l.isEqual(r));
  }
}
