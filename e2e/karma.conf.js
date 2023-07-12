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

function getTestFiles(argv) {
  const files = [];
  if (argv.includes('--compat')) {
    files.push('./tests/compat.test.ts');
  }
  if (argv.includes('--modular')) {
    files.push('./tests/modular.test.ts');
  }
  return files;
}
const karma = require('karma');

module.exports = function (config) {
  config.set({
    frameworks: ['karma-typescript', 'mocha'],
    files: getTestFiles(process.argv),
    preprocessors: {
      './tests/*.test.ts': ['karma-typescript']
    },
    browsers: ['Chrome'],
    singleRun: true,
    client: {
      mocha: {
        timeout: 10000
      }
    },
    customContextFile: './context.html',
    reporters: ['spec'],
    specReporter: {
      maxLogLines: 5, // limit number of lines logged per test
      suppressErrorSummary: true, // do not print error summary
      suppressFailed: false, // do not print information about failed tests
      suppressPassed: false, // do not print information about passed tests
      suppressSkipped: true, // do not print information about skipped tests
      showSpecTiming: false // print the time elapsed for each spec
    },
    concurrency: 1,
    karmaTypescriptConfig: {
      bundlerOptions: {
        resolve: {
          directories: ['./node_modules'],
          alias: {
            'idb': 'node_modules/idb/build/index.js'
          }
        },
        transforms: [
          require('karma-typescript-es6-transform')({
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    browsers: ['last 2 Chrome versions']
                  }
                }
              ]
            ]
          })
        ]
      },
      compilerOptions: {
        allowJs: true,
        'module': 'commonjs',
        'moduleResolution': 'node',
        'resolveJsonModule': true,
        'esModuleInterop': true,
        'sourceMap': true,
        'target': 'es5',
        'importHelpers': true,
        'noEmitOnError': true
      }
    },
    plugins: [
      'karma-typescript',
      'karma-mocha',
      'karma-chrome-launcher',
      'karma-spec-reporter'
    ]
  });
};
