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

import * as firestore from '../../index';

import { tryCast } from './util';
import { BaseFieldPath } from '../../../src/api/field_path';

/**
 * A FieldPath refers to a field in a document. The path may consist of a single
 * field name (referring to a top-level field in the document), or a list of
 * field names (referring to a nested field in the document).
 */
export class FieldPath extends BaseFieldPath implements firestore.FieldPath {
  // Note: This class is stripped down a copy of the FieldPath class in the
  // legacy SDK. The changes are:
  // - The `documentId()` static method has been removed
  // - Input validation is limited to errors that cannot be caught by the
  //   TypeScript transpiler.

  /**
   * Creates a FieldPath from the provided field names. If more than one field
   * name is provided, the path will point to a nested field in a document.
   *
   * @param fieldNames A list of field names.
   */
  constructor(...fieldNames: string[]) {
    super(fieldNames);
  }

  isEqual(other: firestore.FieldPath): boolean {
    const path = tryCast(other, FieldPath);
    return this._internalPath.isEqual(path._internalPath);
  }
}
