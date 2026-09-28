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

import fs from 'fs';
import path from 'path';
import createBaseConfig from '../../config/vitest.base.mjs';

// Ensure `./packages/auth/coverage` exists for the `test-auth` coverage merge step in `.github/workflows/test-all.yml`.
fs.mkdirSync(path.resolve(import.meta.dirname, 'coverage'), {
  recursive: true
});

const config = createBaseConfig(import.meta.url);

config.test.teardownTimeout = 1000;

for (const project of config.test.projects) {
  if (project.test.name === 'node') {
    project.test.exclude = [
      ...(project.test.exclude || []),
      '**/platform_browser/**',
      '**/platform_react_native/**',
      '**/platform_cordova/**',
      'test/integration/**'
    ];
  } else if (project.test.name === 'browser') {
    project.test.exclude = [
      ...(project.test.exclude || []),
      '**/platform_cordova/**',
      '**/platform_react_native/**',
      'test/integration/**'
    ];
  }
}

export default config;
