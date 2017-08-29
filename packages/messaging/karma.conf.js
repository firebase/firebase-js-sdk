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

const karma = require('karma');
const path = require('path');
const karmaBase = require('../../config/karma.base');

module.exports = function(config) {
  const karmaConfig = Object.assign({}, karmaBase, {
    // files to load into karma
    files: [
      { pattern: `test/**/*` }
    ],
    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: [
      'mocha',
    ],
  });
  
  config.set(karmaConfig);
}