/**
 * @license
 * Copyright 2019 Google Inc.
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

// Karma configuration
// Generated on Tue Jan 07 2020 11:37:42 GMT-0800 (Pacific Standard Time)


const karmaBase = require('../../config/karma.base');
const path = require('path');

module.exports = function (config) {
  const karmaConfig = Object.assign({}, karmaBase, {
    // files to load into karma
    files: [
      'test/**/*.test.ts'
    ],

    coverageIstanbulReporter: {
      dir: path.resolve(process.cwd(), 'coverage/browser/%browser%'),
      fixWebpackSourcePaths: true,
      reports: ['html', 'lcovonly'],
      instrumenterOptions: {
        istanbul: { noCompact: true }
      }
    },

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha'],
  });

  config.set(karmaConfig);
};
