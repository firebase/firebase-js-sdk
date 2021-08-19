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

import {
  DOCUMENT_KEY_NAME,
  FieldPath as InternalFieldPath
} from '../model/path';
import { Code, FirestoreError } from '../util/error';

/**
 * A `FieldPath` refers to a field in a document. The path may consist of a
 * single field name (referring to a top-level field in the document), or a
 * list of field names (referring to a nested field in the document).
 *
 * Create a `FieldPath` by providing field names. If more than one field
 * name is provided, the path will point to a nested field in a document.
 */
export class FieldPath {
  /** Internal representation of a Firestore field path. */
  readonly _internalPath: InternalFieldPath;

  /**
   * Creates a `FieldPath` from the provided field names. If more than one field
   * name is provided, the path will point to a nested field in a document.
   *
   * @param fieldNames - A list of field names.
   */
  constructor(...fieldNames: string[]) {
    for (let i = 0; i < fieldNames.length; ++i) {
      if (fieldNames[i].length === 0) {
        throw new FirestoreError(
          Code.INVALID_ARGUMENT,
          `Invalid field name at argument $(i + 1). ` +
            'Field names must not be empty.'
        );
      }
    }

    this._internalPath = new InternalFieldPath(fieldNames);
  }

  /**
   * Returns true if this `FieldPath` is equal to the provided one.
   *
   * @param other - The `FieldPath` to compare against.
   * @returns true if this `FieldPath` is equal to the provided one.
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
