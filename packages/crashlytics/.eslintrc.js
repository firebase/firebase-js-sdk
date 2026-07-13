/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

<<<<<<<< HEAD:packages/crashlytics/.eslintrc.js
module.exports = {
  extends: '../../config/.eslintrc.js',
  parserOptions: {
    project: 'tsconfig.json',
    // to make vscode-eslint work with monorepo
    // https://github.com/typescript-eslint/typescript-eslint/issues/251#issuecomment-463943250
    tsconfigRootDir: __dirname
  }
};
========
const useColors: boolean =
  typeof process !== 'undefined' &&
  (process.env.FORCE_COLOR !== undefined ||
    (!!process.stdout?.isTTY && !process.env.NO_COLOR));

export function bold(text: string): string {
  return useColors ? `\x1b[1m${text}\x1b[22m` : text;
}

export function yellow(text: string): string {
  return useColors ? `\x1b[33m${text}\x1b[39m` : text;
}
>>>>>>>> main:repo-scripts/api-documenter/src/utils/style.ts
