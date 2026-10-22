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
  const cpuCap = process.env.CI
    ? 2
    : Math.max(2, Math.floor(os.cpus().length / 2));
  return Math.max(1, Math.min(12, Math.min(cpuCap, memoryCap)));
}

const maxForks = getConcurrency();

/**
 * Wraps the Playwright browser provider so that when a session uses `vi.mock()`,
 * its `BrowserContext` registers a permanent no-op route on the first mock
 * registration. This keeps Playwright's request interception (`Fetch.enable`
 * and `Network.setCacheDisabled(true)`) active across `mocker.clear()` calls
 * between test files in that session, without enabling network interception
 * for suites that never call `vi.mock()` (such as `@firebase/firestore`
 * live backend integration tests).
 */
function createPlaywrightProvider(options) {
  const baseProvider = playwright(options);
  return {
    ...baseProvider,
    providerFactory(project) {
      const provider = baseProvider.providerFactory(project);
      if (provider.mocker) {
        const routedSessions = new Set();
        const register = provider.mocker.register.bind(provider.mocker);
        provider.mocker.register = async (sessionId, module) => {
          if (!routedSessions.has(sessionId)) {
            routedSessions.add(sessionId);
            await provider
              .getPage(sessionId)
              .context()
              .route(/^$/, route => route.continue());
          }
          return register(sessionId, module);
        };
      }
      return provider;
    }
  };
}

function getCoverageReportsDirectory(packageDir) {
  const lifecycle = process.env.npm_lifecycle_event;
  if (lifecycle && lifecycle !== 'npx') {
    const subdir = lifecycle.replace(/[^a-zA-Z0-9_-]/g, '-');
    return path.resolve(packageDir, 'coverage', subdir);
  }
  const projectArg = process.argv.find(arg => arg.startsWith('--project='));
  if (projectArg) {
    const project = projectArg.split('=')[1].replace(/[^a-zA-Z0-9_-]/g, '-');
    return path.resolve(packageDir, 'coverage', project);
  }
  return path.resolve(packageDir, 'coverage', 'default');
}

export function createBaseConfig(importMetaUrl, customConfig = {}) {
  const packageDir =
    typeof importMetaUrl === 'string'
      ? importMetaUrl.startsWith('file:')
        ? path.dirname(fileURLToPath(importMetaUrl))
        : importMetaUrl
      : process.cwd();

  const setupFile = path.resolve(packageDir, 'test/setup.ts');
  const setupFiles = fs.existsSync(setupFile) ? [setupFile] : [];

  const isChromiumOnly =
    !process.env.BROWSERS ||
    process.env.BROWSERS.split(',').every(
      b => b.trim() === 'ChromeHeadless' || b.trim() === 'chromium'
    );
  const enableCoverage =
    isChromiumOnly &&
    ((Boolean(process.env.CI) && process.env.CI !== 'false') ||
      process.env.COVERAGE === 'true');

  const base = defineConfig({
    test: {
      globals: true,
      reporters: process.env.GITHUB_ACTIONS
        ? ['default', 'github-actions']
        : ['default'],
      coverage: {
        enabled: enableCoverage,
        provider: 'v8',
        reporter: ['html', 'lcovonly'],
        reportsDirectory: getCoverageReportsDirectory(packageDir),
        include: ['src/**/*.ts'],
        exclude: ['**/*.test.ts', '**/test/**', '**/*.d.ts']
      },
      projects: [
        {
          test: {
            name: 'node',
            globals: true,
            environment: 'node',
            pool: 'forks',
            maxWorkers: maxForks,
            isolate: true,
            passWithNoTests: false,
            include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
            exclude: ['**/browser/**', '**/*.browser.test.ts'],
            setupFiles
          }
        },
        {
          plugins: [
            {
              name: 'disable-vite-etag-cache',
              configureServer(server) {
                server.middlewares.use((req, res, next) => {
                  delete req.headers['if-none-match'];
                  res.setHeader('Cache-Control', 'no-store');
                  next();
                });
              }
            }
          ],
          server: {
            headers: {
              'Cache-Control': 'no-store'
            }
          },
          test: {
            name: 'browser',
            globals: true,
            maxWorkers: maxForks,
            browser: {
              enabled: true,
              provider: createPlaywrightProvider({
                launchOptions: {
                  args: ['--disk-cache-size=1', '--media-cache-size=1']
                }
              }),
              instances: [{ browser: 'chromium' }],
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
