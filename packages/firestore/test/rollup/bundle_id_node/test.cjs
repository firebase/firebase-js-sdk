/**
 * @license
 * Copyright 2024 Google LLC
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

const { _ROLLUP_BUNDLE_ID } = require('@firebase/firestore');

const EXPECTED_ROLLUP_BUNDLE_ID = 'node.cjs';

if (_ROLLUP_BUNDLE_ID !== EXPECTED_ROLLUP_BUNDLE_ID) {
  throw new Error(
    `Test FAILED: _ROLLUP_BUNDLE_ID===${_ROLLUP_BUNDLE_ID}, ` +
      `but expected ${EXPECTED_ROLLUP_BUNDLE_ID}`
  );
}

console.log(
  `Test Passed: _ROLLUP_BUNDLE_ID===${_ROLLUP_BUNDLE_ID} (as expected)`
);
