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

import { _BaseFieldPath } from '../../../src/api/field_path';
import { DOCUMENT_KEY_NAME } from '../../../src/model/path';

/**
 * A FieldPath refers to a field in a document. The path may consist of a
 * single field name (referring to a top-level field in the document), or a
 * list of field names (referring to a nested field in the document).
 *
 * Create a FieldPath by providing field names. If more than one field
 * name is provided, the path will point to a nested field in a document.
 */
export class FieldPath extends _BaseFieldPath {
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

  /**
   * Returns true if this `FieldPath` is equal to the provided one.
   *
   * @param other The `FieldPath` to compare against.
   * @return true if this `FieldPath` is equal to the provided one.
   */
  isEqual(other: FieldPath): boolean {
    return this._internalPath.isEqual(other._internalPath);
  }
}

/**
 * Returns a special sentinel `FieldPath` to refer to the ID of a document.
 * It can be used in queries to sort or filter by the document ID.
 */
export function documentId(): FieldPath {
  return new FieldPath(DOCUMENT_KEY_NAME);
}
