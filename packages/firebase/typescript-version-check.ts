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

// The Firebase type declarations require TypeScript 4.5 or later. The
// "typesVersions" field in package.json makes older TypeScript versions load
// this file instead, so they report the error below rather than syntax errors
// in the declarations. It's a .ts file because `skipLibCheck` would hide an
// error in a .d.ts file. It's excluded from tsconfig.json, so the error doesn't
// break this package's build.
export const typescriptVersionCheck: 'firebase requires TypeScript 4.5 or later' =
  'Please upgrade TypeScript';
