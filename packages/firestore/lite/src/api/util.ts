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

import { Code, FirestoreError } from '../../../src/util/error';

/**
 * Casts `obj` to `T`. Throws if  `obj` is not an instance of `T`.
 *
 * This cast is used in the Lite and Full SDK to verify instance types for
 * arguments passed to the public API.
 */
export function cast<T>(
  obj: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor: { new (...args: any[]): T }
): T | never {
  if (!(obj instanceof constructor)) {
    if (constructor.name === obj.constructor.name) {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        'Type does not match the expected instance. Did you pass ' +
          `'${constructor.name}' from a different Firestore SDK?`
      );
    } else {
      throw new FirestoreError(
        Code.INVALID_ARGUMENT,
        `Expected type '${constructor.name}', but was '${obj.constructor.name}'`
      );
    }
  }
  return obj as T;
}
