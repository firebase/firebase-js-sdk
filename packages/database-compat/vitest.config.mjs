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

import createBaseConfig from '../../config/vitest.base.mjs';

const config = createBaseConfig(
  import.meta.url,
  {},
  {
    testTimeout: 30000,
    hookTimeout: 30000,
    retry: process.env.CI ? 3 : 0,
    fileParallelism: false,
    screenshotFailures: false
  }
);

for (const project of config.test.projects) {
  if (project.test.name === 'node') {
    project.test.setupFiles = [
      ...(project.test.setupFiles || []),
      'src/index.node.ts'
    ];
  } else if (project.test.name === 'browser') {
    project.test.setupFiles = [
      ...(project.test.setupFiles || []),
      'src/index.ts'
    ];
    project.define = {
      ...(project.define || {}),
      'process.env.RTDB_EMULATOR_PORT': JSON.stringify(
        process.env.RTDB_EMULATOR_PORT ?? ''
      ),
      'process.env.RTDB_EMULATOR_NAMESPACE': JSON.stringify(
        process.env.RTDB_EMULATOR_NAMESPACE ?? ''
      )
    };
  }
}

export default config;
