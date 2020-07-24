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

module.exports = {
  extends: '../../config/.eslintrc.js',
  parserOptions: {
    project: 'tsconfig.json',
    // to make vscode-eslint work with monorepo
    // https://github.com/typescript-eslint/typescript-eslint/issues/251#issuecomment-463943250
    tsconfigRootDir: __dirname
  },
  plugins: ['import'],
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'import/no-default-export': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        varsIgnorePattern: '^_',
        args: 'none'
      }
    ],
    'no-restricted-globals': [
      'error',
      {
        'name': 'window',
        'message': 'Use `PlatformSupport.getPlatform().window` instead.'
      },
      {
        'name': 'document',
        'message': 'Use `PlatformSupport.getPlatform().document` instead.'
      }
    ]
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/test/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error'
      }
    },
    {
      files: ['scripts/*.ts'],
      rules: {
        'import/no-extraneous-dependencies': 'off',
        '@typescript-eslint/no-require-imports': 'off'
      }
    },
    // TODO(firestorelite): Remove this exception when app-exp is published
    {
      files: ['lite/**/*.ts'],
      rules: {
        'import/no-extraneous-dependencies': 'off'
      }
    },
    // TODO(firestoreexp): Remove this exception when app-exp is published
    {
      files: ['exp/**/*.ts'],
      rules: {
        'import/no-extraneous-dependencies': 'off'
      }
    }
  ]
};
