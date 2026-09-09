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

import '../scripts/ensure_playwright.js';
import { defineConfig, mergeConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import os from 'os';

function getConcurrency() {
  if (process.env.VITEST_MAX_FORKS) {
    return parseInt(process.env.VITEST_MAX_FORKS, 10);
  }
  const totalMemGB = os.totalmem() / (1024 * 1024 * 1024);
  const memoryCap = Math.floor(totalMemGB / 1.5);
  const cpuCap = process.env.CI ? 2 : Math.max(2, Math.floor(os.cpus().length / 2));
  return Math.max(1, Math.min(12, Math.min(cpuCap, memoryCap)));
}

const maxForks = getConcurrency();

export function createBaseConfig(importMetaUrl, customConfig = {}) {
  const packageDir = typeof importMetaUrl === 'string'
    ? (importMetaUrl.startsWith('file:') ? path.dirname(fileURLToPath(importMetaUrl)) : importMetaUrl)
    : process.cwd();

  const setupFile = path.resolve(packageDir, 'test/setup.ts');
  const setupFiles = fs.existsSync(setupFile) ? [setupFile] : [];

  const base = defineConfig({
    optimizeDeps: {
      include: ['chai', 'chai-as-promised', 'sinon', 'sinon-chai']
    },
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
            forks: { maxForks },
            isolate: true,
            passWithNoTests: false,
            include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
            exclude: ['**/browser/**', '**/*.browser.test.ts'],
            setupFiles
          }
        },
        {
          test: {
            name: 'browser',
            globals: true,
            browser: {
              enabled: true,
              provider: playwright(),
              instances: [
                { browser: 'chromium' }
              ],
              headless: true
            },
            isolate: true,
            passWithNoTests: false,
            include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
            exclude: ['**/node/**', '**/*.node.test.ts'],
            setupFiles
          }
        }
      ]
    }
  });

  return customConfig && Object.keys(customConfig).length > 0
    ? mergeConfig(base, customConfig)
    : base;
}

export default createBaseConfig;
