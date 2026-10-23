/**
 * @license
 * Copyright 2026 Google LLC
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
 * Recursively sorts all keys in an object, including nested objects and objects within arrays.
 *
 * @param obj - Candidate value to recursively sort.
 * @returns Value with all nested object keys sorted deterministically.
 * @internal
 * @remarks Prevents prototype pollution by using Object.create(null) to create new objects.
 *
 */
export function deepSortKeysForObj(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(deepSortKeysForObj);
  }
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  return Object.keys(obj as Record<string, unknown>)
    .sort()
    .reduce((result: Record<string, unknown>, key: string) => {
      result[key] = deepSortKeysForObj((obj as Record<string, unknown>)[key]);
      return result;
    }, Object.create(null));
}
