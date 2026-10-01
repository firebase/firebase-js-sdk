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

import { ESLint } from 'eslint';
import { pruneDts } from './pipeline';

export { pruneDts };

const ESLINT_CONFIG_BLANK_LINES: ESLint.Options = {
  overrideConfig: {
    parserOptions: {
      ecmaVersion: 2017,
      sourceType: 'module'
    },
    env: {
      es6: true
    },
    plugins: ['@typescript-eslint'],
    parser: '@typescript-eslint/parser',
    rules: {
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: 'import', next: '*' }
      ]
    }
  },
  useEslintrc: false,
  fix: true
};

// Removes unused imports that were left behind after unexported/internal types were pruned.
const ESLINT_CONFIG_UNUSED_IMPORTS: ESLint.Options = {
  overrideConfig: {
    parserOptions: {
      ecmaVersion: 2017,
      sourceType: 'module'
    },
    env: {
      es6: true
    },
    plugins: ['unused-imports', '@typescript-eslint'],
    parser: '@typescript-eslint/parser',
    rules: {
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-imports-ts': 'error'
    }
  },
  useEslintrc: false,
  fix: true
};

/**
 * Formats declaration files ensuring blank lines between imports and statements.
 */
export async function addBlankLines(fileLocation: string): Promise<void> {
  const eslint = new ESLint(ESLINT_CONFIG_BLANK_LINES);
  const results = await eslint.lintFiles([fileLocation]);
  await ESLint.outputFixes(results);
}

/**
 * Removes unused imports from declaration files.
 */
export async function removeUnusedImports(fileLocation: string): Promise<void> {
  const eslint = new ESLint(ESLINT_CONFIG_UNUSED_IMPORTS);
  const results = await eslint.lintFiles([fileLocation]);
  await ESLint.outputFixes(results);
}
