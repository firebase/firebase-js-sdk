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

/**
 * Represent a "Max Key" type in Firestore documents.
 *
 * @class MaxKey
 */
export class MaxKey {
  private static MAX_KEY_VALUE_INSTANCE: MaxKey | null = null;
  /** A type string to uniquely identify instances of this class. */
  readonly type = 'MaxKey';

  private constructor() {}

  static instance(): MaxKey {
    if (!MaxKey.MAX_KEY_VALUE_INSTANCE) {
      MaxKey.MAX_KEY_VALUE_INSTANCE = new MaxKey();
    }
    return MaxKey.MAX_KEY_VALUE_INSTANCE;
  }
}
