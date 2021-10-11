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
 *
 * @param {'esm'|'cjs'} moduleFormat valid values are esm and cjs
 * @param {number} languageTarget valid values are 5, 2015, 2016 ... 2020
 */
export function generateBuildTargetReplaceConfig(moduleFormat, languageTarget) {
  let buildTarget = '';

  switch (moduleFormat.toLowerCase()) {
    case 'esm':
      buildTarget += 'esm';
      break;
    case 'cjs':
      buildTarget += 'cjs';
      break;
    default:
      throw Error(
        `unsupported module format ${moduleFormat}. Valid values are esm and cjs.`
      );
  }

  if (typeof languageTarget !== 'number') {
    throw Error(`languageTarget accepts only number`);
  }

  // simplified input validation
  if (languageTarget != 5 && languageTarget < 2015) {
    throw Error(
      `invalid languageTarget ${languageTarget}. Valid values are 5, 2015, 2016, etc.`
    );
  }

  buildTarget += languageTarget;

  return {
    [BUILD_TARGET_MAGIC_STRING]: buildTarget
  };
}

export const BUILD_TARGET_MAGIC_STRING = '__BUILD_TARGET__';
