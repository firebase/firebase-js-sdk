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

/**
 * The unique ID for this bundled version of the Firestore SDK as assigned by
 * rollup.js at bundling time, or some undefined value if the SDK was not
 * bundled with rollup.
 *
 * The ID can be used to determine which rollup.js plugins were used to bundle
 * the SDK. See `../../rollup.shared.js` for details about how this value gets
 * set by rollup at bundling time.
 *
 * The initial use case for this value is in tests that verify the bundled
 * output of rollup.js.
 *
 * @internal
 */
export const ROLLUP_BUNDLE_ID = '__FIRESTORE_ROLLUP_BUNDLE_ID__';
