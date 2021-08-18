/**
 * @license
 * Copyright 2021 Google LLC
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

import { FirestoreError } from '@firebase/firestore';
import { SetOptions } from '@firebase/firestore-types';

export function validateSetOptions(
  methodName: string,
  options: SetOptions | undefined
): SetOptions {
  if (options === undefined) {
    return {
      merge: false
    };
  }

  if (options.mergeFields !== undefined && options.merge !== undefined) {
    throw new FirestoreError(
      'invalid-argument',
      `Invalid options passed to function ${methodName}(): You cannot ` +
        'specify both "merge" and "mergeFields".'
    );
  }

  return options;
}
