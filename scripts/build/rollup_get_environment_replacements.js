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

/**
 * Generates the `rollup-plugin-replace` configuration that enables tree-shaking
 * of platform-specific code by replacing runtime checks like `isNode()` with boolean literals
 * at build time.
 *
 * For a browser build, `if (isNode()) { ... }` becomes `if (false) { ... }`.
 * This allows Rollup to identify and eliminate the Node-specific code branches
 * and their imports as dead code. The reverse is true for Node builds.
 */
export function getEnvironmentReplacements(environment) {
  const replacements = {
    delimiters: ['', ''], // Set to empty strings to replace the entire function call (`isNode()`), not just a variable
    preventAssignment: true
  };

  switch (environment) {
    case 'browser':
      return {
        ...replacements,
        'isNode()': 'false',
        'isBrowser()': 'true'
      };
    case 'node':
      return {
        ...replacements,
        'isNode()': 'true',
        'isBrowser()': 'false'
      };
    default:
      throw new Error(`Unknown build environment: ${environment}`);
  }
}
