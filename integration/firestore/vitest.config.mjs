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

import path from 'path';
import { fileURLToPath } from 'url';
import createBaseConfig from '../../config/vitest.base.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function projectConfigRequirePlugin() {
  return {
    name: 'firestore-integration-project-config',
    enforce: 'pre',
    transform(code, id) {
      const cleanId = id.split('?')[0];
      if (
        cleanId.endsWith('.ts') &&
        code.includes("require('../../../../../../config/project.json')")
      ) {
        return {
          code: code.replace(
            /const (\w+) = require\('\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/config\/project\.json'\);/g,
            "import $1 from '../../../../../../config/project.json';"
          ),
          map: null
        };
      }
      return null;
    }
  };
}

const config = createBaseConfig(import.meta.url);

config.test.projects = config.test.projects
  .filter(project => project.test?.name === 'browser')
  .map(project => ({
    ...project,
    optimizeDeps: {
      ...(project.optimizeDeps || {}),
      include: [
        ...(project.optimizeDeps?.include || []),
        'buffer',
        '@js-temporal/polyfill'
      ]
    },
    plugins: [...(project.plugins || []), projectConfigRequirePlugin()],
    test: {
      ...project.test,
      include: ['temp/test/integration/api/**/*.test.ts'],
      setupFiles: [path.resolve(__dirname, 'temp/test/setup.ts')],
      fileParallelism: false,
      isolate: false,
      testTimeout: 20000,
      hookTimeout: 20000,
      retry: process.env.CI ? 3 : 0,
      browser: {
        ...project.test.browser,
        screenshotFailures: false
      }
    }
  }));

export default config;
