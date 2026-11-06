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

/** Formats an object as a JSON string, suitable for logging. */
export function formatJSON(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch (e: unknown) {
    return safeStringify(value);
  }
}

/**
 * Custom JSON stringification utilizing a replacer to work around common
 * JSON.stringify(...) error cases: circular reference or bigint.
 * @param value - object to stringify
 */
function safeStringify(value: unknown): string {
  const cache = new Set();
  return JSON.stringify(value, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    } else if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}
