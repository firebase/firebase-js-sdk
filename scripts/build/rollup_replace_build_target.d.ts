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

// NOTE: This file is hand-written so that rollup_replace_build_target.js
// can be consumed from TypeScript files. If the exports of that files are
// changed then this file will need to be manually updated.

import type { RollupReplaceOptions } from 'rollup-plugin-replace';

export function generateBuildTargetReplaceConfig(
  moduleFormat: string,
  languageTarget: number
): RollupReplaceOptions;

export const BUILD_TARGET_MAGIC_STRING: string;
