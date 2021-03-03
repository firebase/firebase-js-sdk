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

import { nodeResolve } from '@rollup/plugin-node-resolve';

// This is run from the auth-exp package.json
export default {
  input: ['test/integration/webdriver/static/index.js'],
  output: {
    file: 'test/integration/webdriver/static/dist/bundle.js',
    format: 'esm'
  },
  plugins: [nodeResolve()]
};
