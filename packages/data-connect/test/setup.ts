/* eslint-disable no-console */
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

beforeEach(function (this: Mocha.Context) {
  if (this.currentTest) {
    console.log(`>>> TEST START: ${this.currentTest.fullTitle()}`);
  }
});

afterEach(function (this: Mocha.Context) {
  if (this.currentTest) {
    const state = this.currentTest.state || 'completed';
    console.log(`<<< TEST END: ${this.currentTest.fullTitle()} [${state}]`);
  }
});
