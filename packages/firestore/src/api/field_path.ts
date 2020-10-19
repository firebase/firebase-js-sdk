/**
 * @license
 * Copyright 2017 Google LLC
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

import { FieldPath as PublicFieldPath } from '@firebase/firestore-types';

import { FieldPath as InternalFieldPath } from '../model/path';
import { Code, FirestoreError } from '../util/error';
import {
  invalidClassError,
  validateArgType,
  validateNamedArrayAtLeastNumberOfElements
} from '../util/input_validation';

// The objects that are a part of this API are exposed to third-parties as
// compiled javascript so we want to flag our private members with a leading
// underscore to discourage their use.

/**
 * A field class base class that is shared by the lite, full and legacy SDK,
 * which supports shared code that deals with FieldPaths.
 */
// Use underscore prefix to hide this class from our Public API.
// eslint-disable-next-line @typescript-eslint/naming-convention
export abstract class _BaseFieldPath {
  /** Internal representation of a Firestore field path. */
  readonly _internalPath: InternalFieldPath;

  constructor(fieldNames: string[]) {
    validateNamedArrayAtLeastNumberOfElements(
      'FieldPath',
      fieldNames,
      'fieldNames',
      1
    );

    for (let i = 0; i < fieldNames.length; ++i) {
      validateArgType('FieldPath', 'string', i, fieldNames[i]);
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
}

/**
 * A `FieldPath` refers to a field in a document. The path may consist of a
 * single field name (referring to a top-level field in the document), or a list
 * of field names (referring to a nested field in the document).
 */
export class FieldPath extends _BaseFieldPath implements PublicFieldPath {
  /**
   * Creates a FieldPath from the provided field names. If more than one field
   * name is provided, the path will point to a nested field in a document.
   *
   * @param fieldNames A list of field names.
   */
  constructor(...fieldNames: string[]) {
    super(fieldNames);
  }

  static documentId(): FieldPath {
    /**
     * Internal Note: The backend doesn't technically support querying by
     * document ID. Instead it queries by the entire document name (full path
     * included), but in the cases we currently support documentId(), the net
     * effect is the same.
     */
    return new FieldPath(InternalFieldPath.keyField().canonicalString());
  }

  isEqual(other: PublicFieldPath): boolean {
    if (!(other instanceof FieldPath)) {
      throw invalidClassError('isEqual', 'FieldPath', 1, other);
    }
    return this._internalPath.isEqual(other._internalPath);
  }
}

/**
 * Matches any characters in a field path string that are reserved.
 */
const RESERVED = new RegExp('[~\\*/\\[\\]]');

/**
 * Parses a field path string into a FieldPath, treating dots as separators.
 */
export function fromDotSeparatedString(path: string): FieldPath {
  const found = path.search(RESERVED);
  if (found >= 0) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid field path (${path}). Paths must not contain ` +
        `'~', '*', '/', '[', or ']'`
    );
  }
  try {
    return new FieldPath(...path.split('.'));
  } catch (e) {
    throw new FirestoreError(
      Code.INVALID_ARGUMENT,
      `Invalid field path (${path}). Paths must not be empty, ` +
        `begin with '.', end with '.', or contain '..'`
    );
  }
}
