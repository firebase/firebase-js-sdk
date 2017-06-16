/**
* Copyright 2017 Google Inc.
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
const path = require('path');
const cwd = process.cwd();

module.exports = {
  root: path.resolve(cwd),
  pkg: require(path.resolve(cwd, 'package.json')),
  tsconfig:  require(path.resolve(cwd, 'tsconfig.json')),
  tsconfigTest:  require(path.resolve(cwd, 'tsconfig.test.json')),
  paths: {
    outDir: path.resolve(cwd, 'dist'),
    tempDir: path.resolve(cwd, 'temp'),
    test: {
      unit: [
        'tests/**/*.test.ts',
        '!tests/**/browser/**/*.test.ts',
        '!tests/**/binary/**/*.test.ts',
      ],
      binary: [
        'tests/**/binary/**/*.test.ts',
        '!tests/**/binary/**/browser/**/*.test.ts',    
      ],
      integration: [
        'temp/**/*.test.js',
        '!temp/**/browser/**/*',
        '!temp/**/react-native/**/*',
      ]
    }
  },
  babel: {
    plugins: [
      require('babel-plugin-add-module-exports'),
      require('babel-plugin-minify-dead-code-elimination')
    ],
    presets: [
      [require('babel-preset-env'), {
        "targets": {
          "browsers": [
            "ie >= 9"
          ]
        }
      }]
    ]
  }
};