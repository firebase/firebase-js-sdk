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

/**
 * Generates a unique event identifier with a customizable prefix and length.
 * 
 * This function creates a random alphanumeric string by repeatedly generating
 * random numbers and concatenating their string representations. The resulting
 * event ID consists of the provided prefix followed by a randomly generated
 * string of the specified number of digits.
 * 
 * @param prefix - The string to prepend to the generated random number sequence. Defaults to an empty string.
 * @param digits - The number of random digits to generate for the event ID. Defaults to 10.
 * @returns A string containing the prefix followed by the randomly generated digits.
 * 
 * @example
 * ```typescript
 * _generateEventId('evt_', 8); // Returns something like: 'evt_12345678'
 * _generateEventId(); // Returns something like: '1234567890'
 * ```
 */

export function _generateEventId(prefix = '', digits = 10): string {
  let random = '';
  for (let i = 0; i < digits; i++) {
    random += Math.floor(Math.random() * 10);
  }
  return prefix + random;
}
