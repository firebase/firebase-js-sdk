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

import '../../scripts/ensure_playwright.js';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const setupFile = path.resolve(packageDir, 'test/setup.ts');
const setupFiles = fs.existsSync(setupFile) ? [setupFile] : [];

function generateAliasConfig(platform) {
  return [
    {
      find: /^(.*)\/platform\/([^.\/]*)(\.ts)?$/,
      replacement: `$1/platform/${platform}/$2.ts`
    }
  ];
}

export default defineConfig({
  test: {
    globals: true,
    reporters: process.env.GITHUB_ACTIONS ? ['default', 'github-actions'] : ['default'],
    projects: [
      {
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          pool: 'forks',
          isolate: true,
          passWithNoTests: false,
          include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
          exclude: ['**/browser/**', '**/*.browser.test.ts', 'test/integration/**'],
          setupFiles
        },
        resolve: {
          alias: generateAliasConfig('node')
        }
      },
      {
        test: {
          name: 'browser',
          globals: true,
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            headless: true
          },
          isolate: true,
          passWithNoTests: false,
          include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
          exclude: ['**/node/**', '**/*.node.test.ts', 'test/integration/**'],
          setupFiles
        },
        resolve: {
          alias: generateAliasConfig('browser')
        }
      }
    ]
  }
});
