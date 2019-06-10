/**
 * @license
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

import '../../src/platform_browser/browser_init';

/**
 * This will include all of the test files and compile them as needed
 *
 * Taken from karma-webpack source:
 * https://github.com/webpack-contrib/karma-webpack#alternative-usage
 */

// 'context()' definition requires additional dependency on webpack-env package.
const testsContext = (require as any).context('.', true, /.test$/);
const browserTests = testsContext
  .keys()
  .filter(file => file.indexOf('/node/') < 0);
browserTests.forEach(testsContext);
