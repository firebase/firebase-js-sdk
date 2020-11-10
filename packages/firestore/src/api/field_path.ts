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

import { FieldPath as ExpFieldPath } from '../../lite/src/api/field_path';
import { FieldPath as InternalFieldPath } from '../model/path';
import { Compat } from '../compat/compat';

// The objects that are a part of this API are exposed to third-parties as
// compiled javascript so we want to flag our private members with a leading
// underscore to discourage their use.

/**
 * A `FieldPath` refers to a field in a document. The path may consist of a
 * single field name (referring to a top-level field in the document), or a list
 * of field names (referring to a nested field in the document).
 */
export class FieldPath extends Compat<ExpFieldPath> implements PublicFieldPath {
  /**
   * Creates a FieldPath from the provided field names. If more than one field
   * name is provided, the path will point to a nested field in a document.
   *
   * @param fieldNames A list of field names.
   */
  constructor(...fieldNames: string[]) {
    super(new ExpFieldPath(...fieldNames));
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
    if (other instanceof Compat) {
      other = other._delegate;
    }
    if (!(other instanceof ExpFieldPath)) {
      return false;
    }
    return this._delegate._internalPath.isEqual(other._internalPath);
  }
}
